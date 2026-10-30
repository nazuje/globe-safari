import { burst } from '@playroom/kit';
import { ART } from './art.ts';
import { CROWD, type Dance, type MemberId, MEMBERS, MEMBER_IDS, TINY } from './band.ts';
import { el, onTap } from './dom.ts';
import { LOOP_BARS } from './music.ts';
import type { StyleId } from './styles.ts';

const MAX_PUFFS = 14;
/** How long a stage reaction lasts. Long enough to read, short enough for a mash. */
const REACTION_MS = 320;

const calm = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DANCES: Record<Dance, Keyframe[]> = {
  stretch: [
    { transform: 'scale(1, 1)' },
    { transform: 'scale(1.22, 0.74)', offset: 0.25 },
    { transform: 'scale(0.84, 1.28) translateY(-8%)', offset: 0.6 },
    { transform: 'scale(1, 1)' },
  ],
  stomp: [
    { transform: 'translateY(0) scale(1, 1)' },
    { transform: 'translateY(-20%) scale(0.92, 1.1)', offset: 0.3 },
    { transform: 'translateY(2%) scale(1.2, 0.78)', offset: 0.6 },
    { transform: 'translateY(0) scale(1, 1)' },
  ],
  wobble: [
    { transform: 'rotate(0)' },
    { transform: 'rotate(-13deg) scale(1.08)', offset: 0.25 },
    { transform: 'rotate(11deg) scale(1.08)', offset: 0.6 },
    { transform: 'rotate(0)' },
  ],
  mouth: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.16) translateY(-6%)', offset: 0.4 },
    { transform: 'scale(1)' },
  ],
  spin: [
    { transform: 'rotate(0) translateY(0)' },
    { transform: 'rotate(180deg) translateY(-6%) scale(1.1)', offset: 0.5 },
    { transform: 'rotate(360deg) translateY(0)' },
  ],
  flap: [
    { transform: 'translateY(0) rotate(0)' },
    { transform: 'translateY(-14%) rotate(-6deg)', offset: 0.35 },
    { transform: 'translateY(-4%) rotate(6deg)', offset: 0.7 },
    { transform: 'translateY(0) rotate(0)' },
  ],
};

const CALM_DANCE: Keyframe[] = [{ filter: 'brightness(1)' }, { filter: 'brightness(1.3)' }, { filter: 'brightness(1)' }];
const MOUTH_OPEN: Keyframe[] = [
  { transform: 'scaleY(0.2)' },
  { transform: 'scaleY(1)', offset: 0.3 },
  { transform: 'scaleY(0.2)' },
];
const WING_LEFT: Keyframe[] = [{ transform: 'rotate(0)' }, { transform: 'rotate(32deg)' }, { transform: 'rotate(0)' }];
const WING_RIGHT: Keyframe[] = [{ transform: 'rotate(0)' }, { transform: 'rotate(-32deg)' }, { transform: 'rotate(0)' }];

/** Restarts a reaction, so a fast mash gets a fresh wiggle each time. */
function replay(target: Element, keyframes: Keyframe[], duration: number): void {
  for (const running of target.getAnimations()) {
    if (running.id === 'reaction') running.cancel();
  }
  const animation = target.animate(keyframes, { duration, easing: 'ease-out' });
  animation.id = 'reaction';
}

interface MemberParts {
  button: HTMLButtonElement;
  body: HTMLElement;
  mouth: SVGElement | null;
  wings: SVGElement[];
  label: HTMLElement;
}

export interface ViewHandlers {
  tapMember(member: MemberId): void;
  tapTiny(): void;
}

/** Everything on the stage. It draws what it's told and knows nothing of the music. */
export class StageView {
  readonly stage = el('main', 'stage');
  readonly crowd = el('div', 'crowd');
  private readonly band = el('div', 'band');
  private readonly tinyRow = el('div', 'tiny-row');
  private readonly puffs = el('div', 'puffs');
  private readonly decor = el('div', 'decor');
  private readonly parts = new Map<MemberId, MemberParts>();
  private readonly handlers: ViewHandlers;
  private fanCount = 0;
  private puffCount = 0;
  private up = false;
  private egg: HTMLElement | null = null;

  constructor(handlers: ViewHandlers) {
    this.handlers = handlers;
    this.crowd.setAttribute('aria-hidden', 'true');
    this.puffs.setAttribute('aria-hidden', 'true');
    this.decor.setAttribute('aria-hidden', 'true');
    const lights = el('div', 'lights');
    lights.setAttribute('aria-hidden', 'true');
    lights.append(el('span', 'beam'), el('span', 'beam'), el('span', 'beam'));
    for (const id of MEMBER_IDS) this.addMember(id);
    this.stage.append(lights, this.decor, this.band, this.tinyRow, this.puffs);
    this.stage.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private addMember(id: MemberId): void {
    const member = MEMBERS[id];
    const button = el('button', 'member');
    button.type = 'button';
    button.dataset.member = id;
    const sway = el('span', 'sway');
    const body = el('span', 'body');
    body.innerHTML = `<svg viewBox="0 -4 120 132" aria-hidden="true">${ART[id]}</svg>`;
    sway.append(body);
    const badge = el('span', 'badge', member.badge);
    badge.setAttribute('aria-hidden', 'true');
    const label = el('span', 'name');
    button.append(sway, badge, label);
    onTap(button, () => this.handlers.tapMember(id));
    this.band.append(button);
    this.parts.set(id, {
      button,
      body,
      label,
      mouth: body.querySelector<SVGElement>('.mouth'),
      wings: [...body.querySelectorAll<SVGElement>('.wing')],
    });
  }

  setNames(names: Record<MemberId, string>): void {
    for (const [id, { button, label }] of this.parts) {
      label.textContent = names[id];
      button.setAttribute('aria-label', names[id]);
    }
  }

  setStyle(style: StyleId, decor: string): void {
    this.stage.dataset.style = style;
    this.decor.textContent = decor;
  }

  /** The first-tap hint: a bouncing finger on one musician, gone at the first tap. */
  showHint(member: MemberId): void {
    const hint = el('span', 'hint', '👆');
    hint.setAttribute('aria-hidden', 'true');
    this.parts.get(member)?.button.append(hint);
  }

  hideHint(): void {
    this.stage.querySelector('.hint')?.remove();
  }

  /** The musician's reaction. Runs the moment it's called, whatever the audio is doing. */
  react(id: MemberId): void {
    const parts = this.parts.get(id);
    if (!parts) return;
    const member = MEMBERS[id];
    replay(parts.body, calm() ? CALM_DANCE : DANCES[member.dance], REACTION_MS);
    if (parts.mouth) replay(parts.mouth, MOUTH_OPEN, REACTION_MS);
    parts.wings.forEach((wing, index) => replay(wing, index === 0 ? WING_LEFT : WING_RIGHT, REACTION_MS));
    this.puff(parts.button, member.puff);
  }

  private puff(from: HTMLElement, emoji: string): void {
    if (calm() || this.puffCount >= MAX_PUFFS) return;
    const box = from.getBoundingClientRect();
    const home = this.stage.getBoundingClientRect();
    const piece = el('span', 'puff', emoji);
    piece.style.left = `${box.left - home.left + box.width * (0.2 + Math.random() * 0.6)}px`;
    piece.style.top = `${box.top - home.top + box.height * 0.3}px`;
    this.puffs.append(piece);
    this.puffCount += 1;
    const drift = Math.round(Math.random() * 60 - 30);
    const flight = piece.animate(
      [
        { opacity: 1, transform: 'translate(-50%, 0) scale(0.6)' },
        { opacity: 0, transform: `translate(calc(-50% + ${drift}px), -90px) scale(1.3)` },
      ],
      { duration: 620, easing: 'ease-out' },
    );
    flight.onfinish = () => {
      piece.remove();
      this.puffCount -= 1;
    };
  }

  /** Everyone bobs to the beat. */
  beat(): void {
    this.up = !this.up;
    this.crowd.classList.toggle('up', this.up);
    this.band.classList.toggle('up', this.up);
    this.stage.classList.toggle('flash', this.up);
  }

  drawCrowd(count: number): void {
    while (this.fanCount < count) this.addFan(this.fanCount++);
  }

  private addFan(index: number): void {
    // The golden ratio spreads seats evenly however many fans turn up.
    const left = ((index * 0.618 + 0.07) % 1) * 88 + 6;
    const row = index % 3;
    const fan = el('span', `fan row-${row}`, CROWD[(index * 5) % CROWD.length]);
    fan.style.left = `${left}%`;
    fan.style.animationDelay = `${(index % 5) * 0.07}s`;
    this.crowd.append(fan);
  }

  crowdWild(wild: boolean): void {
    this.crowd.classList.toggle('wild', wild);
    if (!wild) return;
    const box = this.crowd.getBoundingClientRect();
    for (let i = 0; i < 3; i++) burst(box.left + (box.width * (i + 0.5)) / 3, box.top, 12);
  }

  drawTiny(friends: readonly string[], fresh = false): void {
    this.tinyRow.replaceChildren(
      ...friends.map((friend, index) => {
        const button = el('button', 'tiny', friend);
        button.type = 'button';
        button.dataset.player = TINY;
        if (fresh && index === friends.length - 1) button.classList.add('fresh');
        onTap(button, () => {
          this.tinyHop(button);
          this.handlers.tapTiny();
        });
        return button;
      }),
    );
    this.stage.classList.toggle('has-tiny', friends.length > 0);
  }

  private tinyHop(button: HTMLElement): void {
    const hop = calm() ? CALM_DANCE : [{ transform: 'translateY(0)' }, { transform: 'translateY(-34%) scale(1.25)' }, { transform: 'translateY(0)' }];
    replay(button, hop, 240);
  }

  hopAllTiny(): void {
    for (const button of this.tinyRow.children) if (button instanceof HTMLElement) this.tinyHop(button);
  }

  spotlight(member: MemberId | null): void {
    this.stage.classList.toggle('solo', member !== null);
    for (const [id, { button }] of this.parts) button.classList.toggle('in-spotlight', id === member);
  }

  layEgg(): void {
    const chicken = this.parts.get('chicken');
    if (!chicken || this.egg) return;
    this.egg = el('span', 'egg', '🥚');
    this.egg.setAttribute('aria-hidden', 'true');
    chicken.button.append(this.egg);
  }

  crackEgg(): void {
    this.egg?.classList.add('cracking');
  }

  hatchEgg(): void {
    if (!this.egg) return;
    const box = this.egg.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2, 14);
    this.egg.remove();
    this.egg = null;
  }

  /** Clears whatever a stopped band left on stage. Tiny friends and fans stay. */
  clearEffects(): void {
    this.spotlight(null);
    this.crowdWild(false);
    this.egg?.remove();
    this.egg = null;
  }
}

/** The eight-bar progress bar, drawn as eight blocks so it reads as "fill it up". */
export class Meter {
  readonly element = el('div', 'meter');
  private readonly fill = el('span', 'meter-fill');

  constructor() {
    this.element.setAttribute('aria-hidden', 'true');
    const blocks = el('span', 'meter-blocks');
    for (let i = 0; i < LOOP_BARS; i++) blocks.append(el('span', 'meter-block'));
    this.element.append(this.fill, blocks);
  }

  draw(progress: number, mode: 'off' | 'song' | 'take'): void {
    this.element.dataset.mode = mode;
    this.fill.style.transform = `scaleX(${progress})`;
  }
}
