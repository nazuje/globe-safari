import { burst, speak, stopSpeaking } from '@playroom/kit';
import { friendSvg, houseSvg } from './art.ts';
import { byId, calmMotion, wait } from './dom.ts';
import { doorNudge, giggle, hop, hopAlong, poseTransform, sillyShake, type HopParts, type Pose } from './hop.ts';
import { GIGGLE_LINES, HINT_LINE, WRONG_LINES, cheerLine, doorLabel, promptLine } from './lines.ts';
import { pathStones, type Point } from './path.ts';
import { judgeTap, type Friend, type Question, type Round, type SizeName } from './rounds.ts';

const SIZE_SCALE: Record<SizeName, number> = { big: 1.2, middle: 1, small: 0.68 };
const SVG_NS = 'http://www.w3.org/2000/svg';
const PATH_BEND = 0.14;
const FIRST_FRIEND_HINT_MS = 5000;
const IDLE_HINT_MS = 11000;
const TALK_MS = 1000;
const CHEER_PAUSE_MS = 1700;
const ENTER_HOPS = 3;
const IN_DOOR_SCALE = 0.34;

interface PlayHooks {
  onHome(friendsHome: number): void;
  onRoundDone(round: Round): void;
}

type Phase = 'busy' | 'waiting';

/** One street of three houses and one friend at a time. Taps only count while the friend is waiting. */
export function createPlay(hooks: PlayHooks) {
  const scene = byId('scene');
  const street = byId('street');
  const yard = byId('yard');
  const stones = byId('stones') as unknown as SVGSVGElement;
  const friendButton = byId<HTMLButtonElement>('friend');
  const body = byId('friend-body');
  const parts: HopParts = { friend: friendButton, body, shadow: byId('friend-shadow') };

  let round: Round | null = null;
  let index = 0;
  let misses = 0;
  let tapTurn = 0;
  let phase: Phase = 'busy';
  let idleTimer = 0;
  let hintTaught = false;
  let houses: HTMLButtonElement[] = [];

  function question(): Question {
    if (!round) throw new Error('No round is running');
    return round.questions[index];
  }

  function friend(): Friend {
    return question().friend;
  }

  function sceneBox(): DOMRect {
    return scene.getBoundingClientRect();
  }

  function relative(point: Point): Point {
    const box = sceneBox();
    return { x: point.x - box.left, y: point.y - box.top };
  }

  /** The friend's middle, given where its feet stand. */
  function standing(feet: Point, scale: number): Pose {
    return { x: feet.x, y: feet.y - (friendButton.offsetHeight * scale) / 2.2, scale };
  }

  function spotFeet(): Point {
    const box = yard.getBoundingClientRect();
    return relative({ x: box.left + box.width / 2, y: box.top + box.height * 0.72 });
  }

  function doorstep(house: HTMLElement): Point {
    const box = house.getBoundingClientRect();
    return relative({ x: box.left + box.width / 2, y: box.bottom + 4 });
  }

  function doorCenter(house: HTMLElement): Point {
    const box = house.querySelector('.door-anchor')?.getBoundingClientRect();
    return box ? relative({ x: box.left + box.width / 2, y: box.top + box.height / 2 }) : doorstep(house);
  }

  function bendFor(door: number): number {
    return (door - 1 || 1) * PATH_BEND;
  }

  function stonesTo(door: number): Point[] {
    return pathStones(spotFeet(), doorstep(houses[door]), bendFor(door));
  }

  function drawStones(): void {
    const { width, height } = sceneBox();
    stones.setAttribute('viewBox', `0 0 ${width} ${height}`);
    stones.replaceChildren(
      ...houses.map((_, door) => {
        const group = document.createElementNS(SVG_NS, 'g');
        group.dataset.door = String(door);
        for (const stone of stonesTo(door)) {
          const dot = document.createElementNS(SVG_NS, 'ellipse');
          dot.setAttribute('cx', String(stone.x));
          dot.setAttribute('cy', String(stone.y));
          dot.setAttribute('rx', '16');
          dot.setAttribute('ry', '9');
          group.append(dot);
        }
        return group;
      }),
    );
  }

  function placeAtSpot(): void {
    friendButton.style.transform = poseTransform(standing(spotFeet(), SIZE_SCALE[friend().size]));
  }

  function refreshLayout(): void {
    if (!round || houses.length === 0) return;
    drawStones();
    if (phase === 'waiting') placeAtSpot();
  }

  function setMood(mood: 'happy' | 'talk' | 'silly' | 'cheer'): void {
    body.dataset.mood = mood;
  }

  function lookToward(x: number): void {
    const from = spotFeet().x;
    const direction = Math.sign(x - from);
    body.style.setProperty('--look', `${direction * 3}px`);
  }

  function talk(line: string): void {
    speak(line);
    setMood('talk');
    window.setTimeout(() => {
      if (body.dataset.mood === 'talk') setMood('happy');
    }, TALK_MS);
  }

  function setUpHouses(doors: Question['doors']): void {
    houses = doors.map((door, position) => {
      const house = document.createElement('button');
      house.type = 'button';
      house.className = 'house';
      house.setAttribute('aria-label', doorLabel(door));
      house.innerHTML = houseSvg(door, position);
      house.style.setProperty('--delay', `${position * 70}ms`);
      house.addEventListener('click', () => tapDoor(position));
      return house;
    });
    street.replaceChildren(...houses);
  }

  function showHint(): void {
    houses.forEach((house, door) => {
      const right = door === question().answer;
      house.classList.toggle('hint', right);
      house.classList.toggle('faded', !right);
    });
  }

  function stopIdleTimer(): void {
    window.clearTimeout(idleTimer);
  }

  function startIdleTimer(): void {
    stopIdleTimer();
    const delay = hintTaught ? IDLE_HINT_MS : FIRST_FRIEND_HINT_MS;
    idleTimer = window.setTimeout(() => {
      hintTaught = true;
      if (phase !== 'waiting') return;
      showHint();
      giggle(body);
      talk(promptLine(question()));
    }, delay);
  }

  function setWaiting(): void {
    phase = 'waiting';
    friendButton.classList.add('waiting');
    refreshLayout();
    startIdleTimer();
  }

  function setBusy(): void {
    phase = 'busy';
    friendButton.classList.remove('waiting');
    stopIdleTimer();
  }

  async function bringFriend(): Promise<void> {
    const { friend: guest, doors } = question();
    misses = 0;
    setBusy();
    setMood('happy');
    setUpHouses(doors);
    drawStones();
    stones.classList.remove('going');
    body.style.setProperty('--look', '0px');
    body.innerHTML = friendSvg(guest);

    const scale = SIZE_SCALE[guest.size];
    const spot = standing(spotFeet(), scale);
    const fromLeft = index % 2 === 0;
    const startX = fromLeft ? -friendButton.offsetWidth : sceneBox().width + friendButton.offsetWidth;
    const stops = Array.from({ length: ENTER_HOPS }, (_, i): Pose => {
      const share = (i + 1) / ENTER_HOPS;
      return { x: startX + (spot.x - startX) * share, y: spot.y, scale };
    });
    friendButton.style.opacity = '1';
    await hopAlong(parts, { x: startX, y: spot.y, scale }, stops);
    talk(promptLine(question()));
    setWaiting();
  }

  async function goHome(door: number): Promise<void> {
    setBusy();
    const house = houses[door];
    const guest = friend();
    const scale = SIZE_SCALE[guest.size];
    house.classList.remove('hint');
    house.classList.add('going-in');
    houses.forEach((other) => {
      if (other !== house) other.classList.add('faded');
    });
    stones.classList.add('going');
    stones.querySelector(`[data-door="${door}"]`)?.classList.add('chosen');

    setMood('cheer');
    lookToward(doorstep(house).x);
    const here = standing(spotFeet(), scale);
    const steps = stonesTo(door).map((stone) => standing(stone, scale));
    await hopAlong(parts, here, steps);

    const last = steps.at(-1) ?? here;
    const center = doorCenter(house);
    const inside: Pose = { ...center, scale: IN_DOOR_SCALE * scale };
    await hop(parts, last, inside, 44);

    friendButton.style.opacity = '0';
    house.classList.add('shut');
    await wait(calmMotion() ? 50 : 420);

    speak(cheerLine(question()));
    house.classList.add('happy');
    const box = sceneBox();
    burst(box.left + center.x, box.top + center.y, 10);
    hooks.onHome(index + 1);
    await wait(CHEER_PAUSE_MS);

    index += 1;
    if (round && index >= round.questions.length) hooks.onRoundDone(round);
    else await bringFriend();
  }

  async function notMyDoor(door: number, result: { hint: boolean }): Promise<void> {
    setBusy();
    tapTurn += 1;
    setMood('silly');
    speak(result.hint ? HINT_LINE : WRONG_LINES[tapTurn % WRONG_LINES.length]);
    doorNudge(houses[door]);
    await sillyShake(body, tapTurn);
    setMood('happy');
    if (result.hint) showHint();
    setWaiting();
  }

  function tapDoor(door: number): void {
    if (phase !== 'waiting') return;
    const result = judgeTap(question(), door, misses);
    misses = result.misses;
    hintTaught = true;
    if (result.home) void goHome(door);
    else void notMyDoor(door, result);
  }

  function sayItAgain(): void {
    if (phase !== 'waiting') return;
    talk(promptLine(question()));
    giggle(body);
    startIdleTimer();
  }

  function tickleFriend(): void {
    if (phase !== 'waiting') return;
    tapTurn += 1;
    giggle(body);
    talk(GIGGLE_LINES[tapTurn % GIGGLE_LINES.length]);
    startIdleTimer();
  }

  friendButton.addEventListener('click', tickleFriend);
  byId('say').addEventListener('click', sayItAgain);
  new ResizeObserver(refreshLayout).observe(scene);

  return {
    start(next: Round, from: number): Promise<void> {
      round = next;
      index = from;
      friendButton.style.opacity = '0';
      return bringFriend();
    },
    /** A grown-up can step out only while a friend is waiting, so no animation is left running. */
    pause(): boolean {
      if (phase !== 'waiting') return false;
      setBusy();
      stopSpeaking();
      return true;
    },
  };
}
