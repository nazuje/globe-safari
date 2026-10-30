import { burst } from '@playroom/kit';
import { characterInfo, NEW_FRIENDS_AFTER_ROUNDS, type CharacterId } from './characters.ts';
import { onTap } from './dom.ts';
import { confetti, flyBird, giggle, puff, sputterAway } from './fx.ts';
import { Half } from './half.ts';
import { text } from './lang/index.ts';
import { defaultOpposite, layoutFor } from './layout.ts';
import { drawCharacters, drawLevels } from './picker.ts';
import { PointerLedger } from './pointers.ts';
import { newRound, otherSide, pickSurprise, pump, rematchArmed, SIDES, type Round, type Side, type Surprise } from './round.ts';
import { loadSave, writeSave, type Save } from './save.ts';
import * as sounds from './sounds.ts';
import { levelInfo, type Level } from './tuning.ts';
import { say, setLine } from './voice.ts';

type Phase = 'setup' | 'countdown' | 'playing' | 'finale' | 'ended';
type Step = 'character' | 'level' | 'ready';

interface Seat {
  character: CharacterId | null;
  level: Level | null;
  step: Step;
  steppedAt: number;
}

const COUNT_MS = 850;
const GOLD_NOTICE_MS = 1300;
const GO_SHOWN_MS = 600;
const LOSER_POP_MS = 900;
const LOSER_BURST = 10;
const WINNER_LINE_MS = 450;
const SPUTTER_MS = 2200;
const BIRD_AFTER_MS = 1800;
const GIGGLE_AFTER_MS = 250;
const REMATCH_CHECK_MS = 100;
const NEXT_LINE_MS = 1000;
// A double tap on a friend shouldn't choose whatever appears under the finger next.
const STEP_GUARD_MS = 300;

export interface Controls {
  hub: HTMLElement;
  seats: HTMLElement;
  change: HTMLElement;
  /** Called when something the top bar shows has changed. */
  onChange: () => void;
}

export class Game {
  private phase: Phase = 'setup';
  private readonly save: Save = loadSave();
  private readonly halves: [Half, Half] = [new Half(), new Half()];
  private readonly seats: [Seat, Seat];
  private readonly ledger = new PointerLedger();
  private round: Round = newRound(['little', 'little']);
  private lastSurprise: Surprise = 'none';
  private bangAt = 0;
  private lastTapAt = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private readonly hub: HTMLElement;
  private readonly onChange: () => void;

  constructor(arena: HTMLElement, controls: Controls) {
    this.hub = controls.hub;
    this.onChange = controls.onChange;
    this.seats = [this.seatFrom(0), this.seatFrom(1)];
    for (const side of SIDES) {
      const { root } = this.halves[side];
      arena.append(root);
      root.addEventListener('pointerdown', (event) => this.press(side, event));
    }
    this.watchFingers();
    onTap(this.hub, () => this.hubTapped());
    onTap(controls.seats, () => this.toggleSeats());
    onTap(controls.change, () => this.toSetup());
    this.applyLayout();
    this.drawAll();
    this.enterSetup();
  }

  private seatFrom(side: Side): Seat {
    const pick = this.save.picks[side];
    return {
      character: pick?.character ?? null,
      level: pick?.level ?? null,
      step: pick ? 'ready' : 'character',
      steppedAt: 0,
    };
  }

  private watchFingers(): void {
    const lift = (event: PointerEvent): void => this.ledger.release(event.pointerId);
    window.addEventListener('pointerup', lift, true);
    window.addEventListener('pointercancel', lift, true);
    // A finger can lift while the page is away, and the page would never hear of it.
    window.addEventListener('blur', () => this.ledger.clear());
    document.addEventListener('visibilitychange', () => this.ledger.clear());
  }

  get opposite(): boolean {
    return (
      this.save.opposite ??
      defaultOpposite(screen.width, screen.height, window.matchMedia('(pointer: coarse)').matches)
    );
  }

  private toggleSeats(): void {
    this.save.opposite = !this.opposite;
    writeSave(this.save);
    this.applyLayout();
    this.onChange();
  }

  applyLayout(): void {
    const { split, flipFirst } = layoutFor(window.innerWidth, window.innerHeight, this.opposite);
    document.body.dataset.split = split;
    this.halves[0].root.classList.toggle('flipped', flipFirst);
  }

  /** Redraws everything from the state already held, such as after a language change. */
  drawAll(): void {
    for (const side of SIDES) {
      this.drawSeat(side);
      this.drawTally(side);
    }
    this.drawHub();
  }

  private drawSeat(side: Side): void {
    const seat = this.seats[side];
    const half = this.halves[side];
    const character = seat.character ? characterInfo(seat.character) : null;
    half.root.setAttribute('aria-label', text().playerLabel(side + 1));
    half.show(character, seat.level ? levelInfo(seat.level).emoji : '');
    const picking = this.phase === 'setup' && seat.step !== 'ready';
    half.root.classList.toggle('picking', picking);
    if (!picking) {
      half.picker.replaceChildren();
    } else if (seat.step === 'character') {
      drawCharacters(half.picker, {
        rounds: this.save.rounds,
        taken: this.seats[otherSide(side)].character,
        onPick: (id) => this.pickCharacter(side, id),
      });
    } else {
      drawLevels(half.picker, {
        heroEmoji: character?.emoji ?? '',
        onPick: (level) => this.pickLevel(side, level),
      });
    }
  }

  private drawTally(side: Side, gained = false): void {
    const { character } = this.seats[side];
    const wins = character ? (this.save.wins[character] ?? 0) : 0;
    this.halves[side].drawTally(wins, text().winsLabel(wins), gained);
  }

  private drawHub(): void {
    const words = text();
    const inSetup = this.phase === 'setup';
    this.hub.textContent = inSetup ? '▶' : '🔁';
    this.hub.setAttribute('aria-label', inSetup ? words.start : words.rematch);
    this.hub.classList.toggle('hub-on', this.hubLive());
  }

  private hubLive(): boolean {
    return this.phase === 'ended' || (this.phase === 'setup' && this.bothReady());
  }

  private bothReady(): boolean {
    return this.seats.every((seat) => seat.step === 'ready');
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    document.body.dataset.phase = phase;
    this.drawHub();
    this.onChange();
  }

  private later(ms: number, run: () => void): void {
    this.timers.push(setTimeout(run, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  // ---------- Choosing players ----------

  private enterSetup(): void {
    const line = this.seats.some((seat) => seat.step === 'character')
      ? () => text().pickFriend
      : () => text().pressGo;
    setLine(line);
  }

  private stepTooSoon(side: Side): boolean {
    return performance.now() - this.seats[side].steppedAt < STEP_GUARD_MS;
  }

  private setStep(side: Side, step: Step): void {
    this.seats[side].step = step;
    this.seats[side].steppedAt = performance.now();
  }

  private pickCharacter(side: Side, id: CharacterId): void {
    if (this.stepTooSoon(side)) return;
    if (this.seats[otherSide(side)].character === id) {
      sounds.nopeSound();
      return;
    }
    this.seats[side].character = id;
    this.setStep(side, 'level');
    sounds.playfulSound();
    say(() => `${text().names[id]}!`);
    this.queueLine(() => text().pickLevel, () => this.seats[side].step === 'level');
    SIDES.forEach((each) => this.drawSeat(each));
    this.drawTally(side);
  }

  /** Speaks after the current line, unless the child has already moved on. */
  private queueLine(line: () => string, wanted: () => boolean): void {
    this.later(NEXT_LINE_MS, () => {
      if (this.phase === 'setup' && wanted()) say(line);
    });
  }

  private pickLevel(side: Side, level: Level): void {
    if (this.stepTooSoon(side)) return;
    this.seats[side].level = level;
    this.setStep(side, 'ready');
    sounds.playfulSound();
    this.keepPicks();
    say(() => `${text().levels[level].label}!`);
    if (this.bothReady()) this.queueLine(() => text().pressGo, () => this.bothReady());
    this.drawSeat(side);
    this.drawHub();
  }

  private keepPicks(): void {
    this.save.picks = this.seats.map(({ character, level, step }) =>
      character && level && step === 'ready' ? { character, level } : null,
    ) as Save['picks'];
    writeSave(this.save);
  }

  private backToFriends(side: Side): void {
    if (this.stepTooSoon(side)) return;
    this.seats[side].character = null;
    this.setStep(side, 'character');
    sounds.playfulSound();
    say(() => text().pickFriend);
    SIDES.forEach((each) => this.drawSeat(each));
    this.drawTally(side);
    this.drawHub();
  }

  toSetup(): void {
    this.clearTimers();
    this.ledger.clear();
    this.halves.forEach((half) => {
      half.reset();
      half.setGold(false);
    });
    document.body.classList.remove('new-friends');
    this.setPhase('setup');
    this.drawAll();
    this.enterSetup();
  }

  // ---------- A round ----------

  private hubTapped(): void {
    if (!this.hubLive()) return;
    this.startRound();
  }

  private startRound(): void {
    this.clearTimers();
    this.ledger.clear();
    const [first, second] = this.seats;
    if (!first.level || !second.level) return;
    const surprise = pickSurprise(this.save.rounds, this.lastSurprise, Math.random);
    this.lastSurprise = surprise;
    this.round = newRound([first.level, second.level], surprise);
    this.halves.forEach((half) => {
      half.reset();
      half.setGold(surprise === 'gold');
    });
    document.body.classList.remove('new-friends');
    this.setPhase('countdown');
    SIDES.forEach((side) => this.drawSeat(side));
    if (surprise === 'gold') {
      sounds.goldSound();
      say(() => text().goldRound);
      this.later(GOLD_NOTICE_MS, () => this.countDown(3));
    } else {
      this.countDown(3);
    }
  }

  private countDown(step: number): void {
    if (step === 0) {
      this.go();
      return;
    }
    this.halves.forEach((half) => half.showCount(String(step)));
    sounds.countSound(step);
    say(() => text().countdown[step - 1]);
    this.later(COUNT_MS, () => this.countDown(step - 1));
  }

  private go(): void {
    this.setPhase('playing');
    this.halves.forEach((half) => {
      half.showCount(text().go);
      half.setHint(true);
    });
    sounds.goSound();
    say(() => text().go);
    this.later(GO_SHOWN_MS, () => this.halves.forEach((half) => half.showCount('')));
    if (this.round.surprise === 'bird') this.later(BIRD_AFTER_MS, () => this.sendBird());
  }

  private sendBird(): void {
    if (this.phase !== 'playing') return;
    sounds.birdSound();
    flyBird(() => {
      if (this.phase === 'playing') this.halves.forEach((half) => half.wobble(1.6));
    });
  }

  private press(side: Side, event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!this.ledger.press(event.pointerId, side)) return;
    event.preventDefault();
    this.lastTapAt = performance.now();
    if (this.phase === 'playing') this.pumpTap(side, event);
    else if (this.phase === 'setup') this.setupTap(side, event);
    else this.idleTap(side, event);
  }

  private pumpTap(side: Side, event: PointerEvent): void {
    const half = this.halves[side];
    this.round = pump(this.round, side, event.timeStamp);
    half.setFill(this.round.fill[side]);
    half.wobble();
    half.setHint(false);
    sounds.pumpSound(side, this.round.fill[side]);
    puff(event.clientX, event.clientY);
    if (this.round.winner !== null) this.bang(this.round.winner);
  }

  private setupTap(side: Side, event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    const seat = this.seats[side];
    if (seat.step === 'ready' && target.closest('.hero')) {
      this.backToFriends(side);
      return;
    }
    this.halves[side].boing();
    sounds.playfulSound();
    puff(event.clientX, event.clientY);
  }

  /** The countdown and the celebration still answer a tap, but nothing in the game changes. */
  private idleTap(side: Side, event: PointerEvent): void {
    this.halves[side].boing();
    sounds.playfulSound();
    puff(event.clientX, event.clientY);
  }

  private bang(winner: Side): void {
    const loser = otherSide(winner);
    const gold = this.round.surprise === 'gold';
    const winnerHalf = this.halves[winner];
    const box = winnerHalf.balloonBox();
    this.bangAt = performance.now();
    this.setPhase('finale');
    this.clearTimers();
    winnerHalf.pop();
    winnerHalf.setMood('dance');
    winnerHalf.shake();
    sounds.bangSound();
    confetti(box.left + box.width / 2, box.top + box.height / 2, gold);
    this.record(winner);
    const character = this.seats[winner].character;
    if (character) this.later(WINNER_LINE_MS, () => say(() => text().wins(text().names[character])));
    this.later(LOSER_POP_MS, () => this.loserGoes(loser));
    this.later(REMATCH_CHECK_MS, () => this.waitForQuiet());
  }

  private record(winner: Side): void {
    const character = this.seats[winner].character;
    if (character) this.save.wins[character] = (this.save.wins[character] ?? 0) + 1;
    this.save.rounds += 1;
    writeSave(this.save);
    this.drawTally(winner, true);
  }

  private loserGoes(loser: Side): void {
    const half = this.halves[loser];
    if (this.round.surprise === 'sputter') {
      const character = this.seats[loser].character;
      sputterAway(half.balloonBox(), character ? characterInfo(character).color : '#fff', SPUTTER_MS);
      sounds.sputterSound(SPUTTER_MS);
    } else {
      sounds.tootPop();
      const box = half.balloonBox();
      burst(box.left + box.width / 2, box.top + box.height / 2, LOSER_BURST);
    }
    half.pop();
    this.later(GIGGLE_AFTER_MS, () => {
      half.setMood('laugh');
      sounds.laughSound();
      const hero = half.heroBox();
      giggle(hero.left + hero.width / 2, hero.top);
    });
  }

  private waitForQuiet(): void {
    if (rematchArmed(this.bangAt, this.lastTapAt, performance.now())) {
      this.setPhase('ended');
      say(() => text().again);
      this.announceNewFriends();
    } else {
      this.later(REMATCH_CHECK_MS, () => this.waitForQuiet());
    }
  }

  private announceNewFriends(): void {
    if (this.save.rounds !== NEW_FRIENDS_AFTER_ROUNDS) return;
    document.body.classList.add('new-friends');
    this.later(1000, () => say(() => text().newFriends));
  }

  get canChangePlayers(): boolean {
    return this.phase === 'ended';
  }
}
