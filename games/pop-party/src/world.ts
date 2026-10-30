import { bubbleTarget, bubbleUnit, chooseKind, findHit, GIANT_TAPS, isShowpiece, KINDS, type BubbleKind } from './bubbles.ts';
import { addFriend, pickFriend, pickRareFriend, type Collection, type Rng } from './collection.ts';
import { FRIENDS, type FriendId } from './friends.ts';
import { partyGoal } from './party.ts';
import { particlePool, stepParticles, takeParticle, type Particle } from './particles.ts';
import { shelfLayout, slotCentre, type ShelfLayout } from './shelf.ts';

export const COLORS = ['#ff6b6b', '#ffb020', '#3ecf8e', '#4cb8ff', '#8b5cf6', '#ff7ac6', '#19c9c0', '#a4d62f'];
const CONFETTI = ['#ff6b6b', '#ffc93c', '#3ecf8e', '#4cb8ff', '#8b5cf6', '#ff7ac6'];

export const MAX_BUBBLES = 30;
const MAX_ACTORS = 12;
const RISE_SPEED = 72;
const SPAWN_GAP_S = 0.75;
const FIRST_BUBBLE_ALONE_S = 4;
const NEW_FRIEND_GAP_S = 2;
const RAIN_S = 5;
const RAIN_GAP_S = 0.14;
const PARTY_S = 3.6;
const SNEEZE_WINDUP_S = 0.55;
const ZOOM_S = 2.8;
const ZOOM_SPEED = 430;
const TOOT_GAP_S = 0.32;
const SHOWER_SIZE = 10;
const PARADE_SIZE = 5;
const TUMBLE_S = 0.5;
const DANCE_S = 0.9;
const FLY_S = 0.55;

export type BubbleState = 'float' | 'sneeze' | 'zoom';

export interface Bubble {
  alive: boolean;
  kind: BubbleKind;
  state: BubbleState;
  x: number;
  y: number;
  r: number;
  baseR: number;
  homeX: number;
  vx: number;
  vy: number;
  drift: number;
  phase: number;
  age: number;
  /** Extra wobble, which a giant bubble gains with every tap. */
  wobble: number;
  taps: number;
  /** Counts down through the sneeze wind-up or the zoom. */
  timer: number;
  nextToot: number;
  heading: number;
  /** A quick white flash after a tap, from 1 to 0. */
  flash: number;
  color: number;
}

export type ActorStage = 'tumble' | 'dance' | 'fly';

export interface Actor {
  alive: boolean;
  friend: FriendId;
  emoji: string;
  stage: ActorStage;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  scale: number;
  t: number;
  danceFor: number;
  groundY: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Lands on the shelf when true; otherwise it waves and flies off the top. */
  toShelf: boolean;
}

export type GameEvent =
  | { type: 'pop'; step: number }
  | { type: 'mini-pop' }
  | { type: 'miss' }
  | { type: 'giant-hit'; taps: number }
  | { type: 'shower' }
  | { type: 'sneeze-start' }
  | { type: 'sneeze' }
  | { type: 'toot-start' }
  | { type: 'toot' }
  | { type: 'rain' }
  | { type: 'golden'; x: number; y: number }
  | { type: 'new-friend'; friend: FriendId }
  | { type: 'landed' }
  | { type: 'party'; x: number; y: number }
  | { type: 'everyone'; x: number; y: number }
  | { type: 'save' };

export interface WorldOptions {
  collection: Collection;
  emit: (event: GameEvent) => void;
  rng?: Rng;
  calm?: boolean;
}

const INDEX_OF = new Map<FriendId, number>(FRIENDS.map((friend, index) => [friend.id, index]));
const EMOJI_OF = new Map<FriendId, string>(FRIENDS.map((friend) => [friend.id, friend.emoji]));
const IS_RARE = new Map<FriendId, boolean>(FRIENDS.map((friend) => [friend.id, friend.rare]));

function newBubble(): Bubble {
  return {
    alive: false,
    kind: 'plain',
    state: 'float',
    x: 0,
    y: 0,
    r: 1,
    baseR: 1,
    homeX: 0,
    vx: 0,
    vy: 0,
    drift: 0,
    phase: 0,
    age: 0,
    wobble: 0,
    taps: 0,
    timer: 0,
    nextToot: 0,
    heading: 0,
    flash: 0,
    color: 0,
  };
}

function newActor(): Actor {
  return {
    alive: false,
    friend: 'kitten',
    emoji: '',
    stage: 'tumble',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    scale: 1,
    t: 0,
    danceFor: 0,
    groundY: 0,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    toShelf: false,
  };
}

/**
 * Everything happening on the stage, with no DOM in sight. All the objects are made once and
 * reused, so a long game of mashing gives an old tablet no garbage to stop and clean up.
 */
export class World {
  readonly bubbles: Bubble[] = Array.from({ length: MAX_BUBBLES }, newBubble);
  readonly actors: Actor[] = Array.from({ length: MAX_ACTORS }, newActor);
  readonly particles: Particle[] = particlePool();
  /** Friends sitting on the shelf. They arrive after the flight, a moment after being found. */
  readonly onShelf = new Set<FriendId>();
  /** Each shelf place's hop, from 1 to 0. */
  readonly hops: number[] = FRIENDS.map(() => 0);
  readonly collection: Collection;

  width = 0;
  height = 0;
  /** Top of the shelf: bubbles come up from behind it. */
  floor = 0;
  unit = 46;
  shelf: ShelfLayout = shelfLayout(360, FRIENDS.length, 600);
  time = 0;
  meter = 0;
  parties = 0;
  partyLeft = 0;
  rainLeft = 0;
  calm: boolean;
  /** Set when the device can't keep up: fewer bubbles and less confetti. */
  slow = false;
  /** True until the first tap, while the finger hint shows. */
  waitingForTap = true;

  private readonly emit: (event: GameEvent) => void;
  private readonly rng: Rng;
  private spawnIn = 0;
  private rainIn = 0;
  private lastFriend: FriendId | null = null;
  private lastNewAt = Number.NEGATIVE_INFINITY;
  private lastX = 0;
  private paradeNext = 0;
  /** The last friend just landed: the next free moment belongs to the biggest party of all. */
  private everyoneHome = false;

  constructor({ collection, emit, rng = Math.random, calm = false }: WorldOptions) {
    this.collection = collection;
    this.emit = emit;
    this.rng = rng;
    this.calm = calm;
    for (const id of collection.found) this.onShelf.add(id);
  }

  get goal(): number {
    return partyGoal(this.parties);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.shelf = shelfLayout(width, FRIENDS.length, height);
    this.floor = height - this.shelf.height;
    this.unit = bubbleUnit(width, this.floor);
    for (const bubble of this.bubbles) {
      if (bubble.alive) bubble.homeX = this.keepInside(bubble.homeX, bubble.r);
    }
  }

  private keepInside(x: number, r: number): number {
    return Math.max(r, Math.min(this.width - r, x));
  }

  private random(from: number, to: number): number {
    return from + this.rng() * (to - from);
  }

  // ---------- Taps ----------

  tap(x: number, y: number): void {
    this.waitingForTap = false;
    const bubble = findHit(this.bubbles, x, y, (candidate) => candidate.state !== 'sneeze');
    if (!bubble) {
      this.ring(x, y, this.unit * 0.5, '#ffffff', 0.35);
      this.emit({ type: 'miss' });
      return;
    }
    bubble.flash = 1;
    if (bubble.state === 'zoom') this.emit({ type: 'toot' });
    else if (bubble.kind === 'giant') this.tapGiant(bubble);
    else if (bubble.kind === 'sleepy') this.startSneeze(bubble);
    else if (bubble.kind === 'toot') this.startZoom(bubble);
    else this.pop(bubble);
  }

  private tapGiant(bubble: Bubble): void {
    bubble.taps += 1;
    if (bubble.taps >= GIANT_TAPS) {
      this.emit({ type: 'shower' });
      this.showerFrom(bubble);
      this.pop(bubble);
      return;
    }
    bubble.wobble = bubble.taps * 1.4;
    bubble.r = bubble.baseR * (1 + bubble.taps * 0.09);
    bubble.vy = 70;
    this.emit({ type: 'giant-hit', taps: bubble.taps });
    this.sparkle(bubble.x, bubble.y, bubble.r, 6, COLORS[bubble.color]!);
  }

  private startSneeze(bubble: Bubble): void {
    bubble.state = 'sneeze';
    bubble.timer = SNEEZE_WINDUP_S;
    bubble.vy = 0;
    bubble.vx = 0;
    this.emit({ type: 'sneeze-start' });
  }

  private finishSneeze(bubble: Bubble): void {
    this.emit({ type: 'sneeze' });
    for (const other of this.bubbles) {
      if (!other.alive || other === bubble || other.state !== 'float') continue;
      const gap = other.x - bubble.x;
      const reach = this.unit * 6;
      if (Math.abs(gap) < reach) other.vx += Math.sign(gap || 1) * (reach - Math.abs(gap)) * 3;
    }
    this.sparkle(bubble.x, bubble.y, bubble.r, 14, '#ffffff');
    this.pop(bubble);
  }

  private startZoom(bubble: Bubble): void {
    bubble.state = 'zoom';
    bubble.timer = ZOOM_S;
    bubble.nextToot = TOOT_GAP_S;
    bubble.heading = this.random(0, Math.PI * 2);
    this.emit({ type: 'toot-start' });
  }

  private pop(bubble: Bubble): void {
    bubble.alive = false;
    const color = bubble.kind === 'golden' ? '#ffc93c' : COLORS[bubble.color]!;
    if (bubble.kind === 'mini') {
      this.ring(bubble.x, bubble.y, bubble.r, color, 0.3);
      this.sparkle(bubble.x, bubble.y, bubble.r, 3, color);
      this.emit({ type: 'mini-pop' });
      return;
    }
    this.ring(bubble.x, bubble.y, bubble.r * 1.2, color, 0.4);
    this.sparkle(bubble.x, bubble.y, bubble.r, 8, color);
    this.emit({ type: 'pop', step: this.meter });
    this.collection.pops += 1;
    this.meter += 1;
    if (bubble.kind === 'golden') this.emit({ type: 'golden', x: bubble.x, y: bubble.y });
    if (bubble.kind === 'rainbow') this.startRain();
    this.releaseFriend(bubble);
    if (this.meter >= this.goal && this.partyLeft <= 0) this.startParty();
    else if (this.collection.pops % 5 === 0) this.emit({ type: 'save' });
  }

  private releaseFriend(bubble: Bubble): void {
    const rare = bubble.kind === 'golden';
    const mayBeNew = this.time - this.lastNewAt >= NEW_FRIEND_GAP_S;
    const { collection, lastFriend, rng } = this;
    const pick = rare ? pickRareFriend(collection, lastFriend, rng) : pickFriend(collection, mayBeNew, lastFriend, rng);
    this.lastFriend = pick.id;
    if (pick.isNew) {
      this.lastNewAt = this.time;
      addFriend(collection, pick.id);
      this.emit({ type: 'new-friend', friend: pick.id });
      this.emit({ type: 'save' });
    }
    const actor = this.freeActor();
    if (!actor) {
      // Every actor is busy, so this friend skips the show. It's still found.
      if (pick.isNew) this.onShelf.add(pick.id);
      return;
    }
    this.startActor(actor, pick.id, bubble.x, Math.min(bubble.y, this.floor - this.unit), pick.isNew);
    actor.stage = 'tumble';
    actor.vx = this.random(-110, 110);
    actor.vy = -340;
    actor.scale = rare ? 1.5 : bubble.kind === 'giant' ? 1.3 : 1;
    actor.danceFor = rare ? DANCE_S * 2 : DANCE_S;
  }

  private freeActor(): Actor | null {
    const free = this.actors.find((actor) => !actor.alive);
    if (free) return free;
    const dancer = this.actors.find((actor) => actor.stage === 'dance');
    if (dancer) this.takeOff(dancer);
    return null;
  }

  private startActor(actor: Actor, friend: FriendId, x: number, y: number, toShelf: boolean): void {
    actor.alive = true;
    actor.friend = friend;
    actor.emoji = EMOJI_OF.get(friend)!;
    actor.stage = 'dance';
    actor.x = x;
    actor.y = y;
    actor.groundY = y;
    actor.vx = 0;
    actor.vy = 0;
    actor.rot = 0;
    actor.scale = 1;
    actor.t = 0;
    actor.danceFor = DANCE_S;
    actor.toShelf = toShelf;
  }

  private takeOff(actor: Actor): void {
    const index = INDEX_OF.get(actor.friend)!;
    actor.stage = 'fly';
    actor.t = 0;
    actor.fromX = actor.x;
    actor.fromY = actor.y;
    if (actor.toShelf) {
      const place = slotCentre(this.shelf, index, this.height);
      actor.toX = place.x;
      actor.toY = place.y;
    } else {
      actor.toX = actor.x + this.random(-120, 120);
      actor.toY = -this.unit * 2;
      this.hops[index] = 1;
    }
  }

  // ---------- Big moments ----------

  private showerFrom(bubble: Bubble): void {
    for (let i = 0; i < SHOWER_SIZE; i++) {
      const mini = this.takeBubble('mini');
      if (!mini) return;
      const angle = (i / SHOWER_SIZE) * Math.PI * 2;
      const speed = this.random(160, 300);
      this.placeBubble(mini, bubble.x, bubble.y);
      mini.vx = Math.cos(angle) * speed;
      mini.vy = Math.sin(angle) * speed;
    }
  }

  private startRain(): void {
    if (this.rainLeft <= 0) this.emit({ type: 'rain' });
    this.rainLeft = RAIN_S;
    this.rainIn = 0;
  }

  private startParty(): void {
    const everyone = this.everyoneHome;
    this.everyoneHome = false;
    this.meter = 0;
    this.parties += 1;
    this.partyLeft = PARTY_S;
    const centreY = this.floor / 2;
    this.emit(everyone ? { type: 'everyone', x: this.width / 2, y: centreY } : { type: 'party', x: this.width / 2, y: centreY });
    this.emit({ type: 'save' });
    const pieces = this.calm ? 10 : this.slow ? 40 : 80;
    for (let i = 0; i < pieces; i++) this.confetti();
    if (!this.calm) this.parade();
    for (let i = 0; i < this.hops.length; i++) this.hops[i] = 1;
  }

  private confetti(): void {
    const piece = takeParticle(this.particles, 'confetti', this.random(0, this.width), this.random(-this.height * 0.5, 0));
    if (!piece) return;
    piece.vx = this.random(-40, 40);
    piece.vy = this.random(180, 340);
    piece.life = this.random(2.2, 3.4);
    piece.size = this.random(8, 14);
    piece.color = CONFETTI[Math.floor(this.rng() * CONFETTI.length)]!;
    piece.spin = this.random(-8, 8);
  }

  /** Friends already on the shelf jump into the party too. */
  private parade(): void {
    const found = this.collection.found;
    const margin = this.unit;
    for (let i = 0; i < PARADE_SIZE && found.length > 0; i++) {
      const actor = this.actors.find((candidate) => !candidate.alive);
      if (!actor) return;
      const friend = found[this.paradeNext++ % found.length]!;
      const x = margin + ((i + 0.5) / PARADE_SIZE) * (this.width - margin * 2);
      this.startActor(actor, friend, x, this.floor * this.random(0.4, 0.75), false);
      actor.danceFor = PARTY_S * 0.75;
      actor.scale = 1.2;
    }
  }

  private ring(x: number, y: number, size: number, color: string, life: number): void {
    const ring = takeParticle(this.particles, 'ring', x, y);
    if (!ring) return;
    ring.size = size;
    ring.color = color;
    ring.life = life;
  }

  private sparkle(x: number, y: number, r: number, count: number, color: string): void {
    const pieces = this.calm || this.slow ? Math.ceil(count / 2) : count;
    for (let i = 0; i < pieces; i++) {
      const angle = this.random(0, Math.PI * 2);
      const dot = takeParticle(this.particles, 'dot', x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      if (!dot) return;
      const speed = this.random(60, 200);
      dot.vx = Math.cos(angle) * speed;
      dot.vy = Math.sin(angle) * speed;
      dot.gravity = 240;
      dot.life = this.random(0.3, 0.6);
      dot.size = this.random(3, 7);
      dot.color = color;
    }
  }

  // ---------- Bubbles coming in ----------

  private takeBubble(kind: BubbleKind): Bubble | null {
    const bubble = this.bubbles.find((candidate) => !candidate.alive);
    if (!bubble) return null;
    const r = this.unit * KINDS[kind].size * (kind === 'plain' ? this.random(0.88, 1.14) : 1);
    bubble.alive = true;
    bubble.kind = kind;
    bubble.state = 'float';
    bubble.r = r;
    bubble.baseR = r;
    bubble.vx = 0;
    bubble.age = 0;
    bubble.wobble = 0;
    bubble.taps = 0;
    bubble.timer = 0;
    bubble.flash = 0;
    bubble.phase = this.random(0, Math.PI * 2);
    bubble.color = Math.floor(this.rng() * COLORS.length);
    const rise = RISE_SPEED * KINDS[kind].speed * this.random(0.9, 1.15) * (this.height / 700) ** 0.5;
    bubble.drift = -rise * (this.calm ? 0.7 : 1);
    bubble.vy = bubble.drift;
    return bubble;
  }

  private placeBubble(bubble: Bubble, x: number, y: number): void {
    bubble.homeX = this.keepInside(x, bubble.r);
    bubble.x = bubble.homeX;
    bubble.y = y;
  }

  private regularCount(): number {
    let count = 0;
    for (const bubble of this.bubbles) if (bubble.alive && bubble.kind !== 'mini') count += 1;
    return count;
  }

  private spawn(): void {
    const showpieceOut = this.bubbles.some((bubble) => bubble.alive && isShowpiece(bubble.kind));
    const firstEver = this.isFirstGame();
    const kind = firstEver ? 'plain' : chooseKind(this.collection, showpieceOut, this.rng);
    const bubble = this.takeBubble(kind);
    if (!bubble) return;
    if (firstEver && !this.bubbles.some((other) => other.alive && other !== bubble)) {
      // The very first bubble starts in plain view, ready for the finger hint.
      this.placeBubble(bubble, this.width / 2, this.floor * 0.68);
      return;
    }
    let x = this.random(bubble.r, this.width - bubble.r);
    for (let tries = 0; tries < 4 && Math.abs(x - this.lastX) < bubble.r * 2; tries++) {
      x = this.random(bubble.r, this.width - bubble.r);
    }
    this.lastX = x;
    this.placeBubble(bubble, x, this.floor + bubble.r);
  }

  private spawnRainDrop(): void {
    const mini = this.takeBubble('mini');
    if (!mini) return;
    this.placeBubble(mini, this.random(mini.r, this.width - mini.r), -mini.r);
    mini.drift = this.random(170, 260) * (this.calm ? 0.5 : 1);
    mini.vy = mini.drift;
  }

  private isFirstGame(): boolean {
    return this.collection.pops === 0;
  }

  private target(): number {
    if (this.isFirstGame() && this.time < FIRST_BUBBLE_ALONE_S) return 1;
    return bubbleTarget(this.width, this.floor, this.unit, this.slow);
  }

  // ---------- Time ----------

  step(dt: number): void {
    if (this.width === 0) return;
    this.time += dt;
    this.partyLeft = Math.max(0, this.partyLeft - dt);
    if (this.everyoneHome && this.partyLeft <= 0) this.startParty();
    this.stepSpawning(dt);
    for (const bubble of this.bubbles) if (bubble.alive) this.stepBubble(bubble, dt);
    for (const actor of this.actors) if (actor.alive) this.stepActor(actor, dt);
    stepParticles(this.particles, dt);
    for (let i = 0; i < this.hops.length; i++) this.hops[i] = Math.max(0, this.hops[i]! - dt * 1.4);
  }

  private stepSpawning(dt: number): void {
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.regularCount() < this.target()) {
      this.spawn();
      this.spawnIn = SPAWN_GAP_S;
    }
    if (this.rainLeft <= 0) return;
    this.rainLeft -= dt;
    this.rainIn -= dt;
    if (this.rainIn <= 0) {
      this.spawnRainDrop();
      this.rainIn = RAIN_GAP_S * (this.calm ? 3 : this.slow ? 2 : 1);
    }
  }

  private stepBubble(bubble: Bubble, dt: number): void {
    bubble.age += dt;
    bubble.flash = Math.max(0, bubble.flash - dt * 5);
    if (bubble.state === 'sneeze') this.stepSneeze(bubble, dt);
    else if (bubble.state === 'zoom') this.stepZoom(bubble, dt);
    else this.stepFloat(bubble, dt);
  }

  private stepFloat(bubble: Bubble, dt: number): void {
    bubble.homeX = this.keepInside(bubble.homeX + bubble.vx * dt, bubble.r);
    bubble.vx *= Math.exp(-2.4 * dt);
    bubble.vy += (bubble.drift - bubble.vy) * Math.min(1, 3 * dt);
    bubble.y += bubble.vy * dt;
    const sway = (this.unit * 0.3 + bubble.wobble * 9 + (this.partyLeft > 0 ? 14 : 0)) * (this.calm ? 0.4 : 1);
    bubble.x = bubble.homeX + Math.sin(bubble.age * (1.6 + bubble.wobble * 1.5) + bubble.phase) * sway;
    const gone = bubble.drift < 0 ? bubble.y + bubble.r < 0 : bubble.y - bubble.r > this.floor;
    if (gone) bubble.alive = false;
  }

  private stepSneeze(bubble: Bubble, dt: number): void {
    bubble.timer -= dt;
    bubble.r = bubble.baseR * (1 + 0.28 * (1 - Math.max(0, bubble.timer) / SNEEZE_WINDUP_S));
    if (bubble.timer <= 0) this.finishSneeze(bubble);
  }

  private stepZoom(bubble: Bubble, dt: number): void {
    bubble.timer -= dt;
    bubble.heading += Math.sin(bubble.age * 7 + bubble.phase) * 7 * dt;
    const speed = ZOOM_SPEED * (this.calm ? 0.4 : 1);
    bubble.x += Math.cos(bubble.heading) * speed * dt;
    bubble.y += Math.sin(bubble.heading) * speed * dt;
    const { r } = bubble;
    if (bubble.x < r || bubble.x > this.width - r) {
      bubble.x = this.keepInside(bubble.x, r);
      bubble.heading = Math.PI - bubble.heading;
    }
    if (bubble.y < r || bubble.y > this.floor - r) {
      bubble.y = Math.max(r, Math.min(this.floor - r, bubble.y));
      bubble.heading = -bubble.heading;
    }
    bubble.nextToot -= dt;
    if (bubble.nextToot <= 0) {
      bubble.nextToot = TOOT_GAP_S;
      this.emit({ type: 'toot' });
      this.puff(bubble);
    }
    if (bubble.timer <= 0) this.pop(bubble);
  }

  private puff(bubble: Bubble): void {
    const puff = takeParticle(this.particles, 'puff', bubble.x, bubble.y);
    if (!puff) return;
    puff.size = bubble.r * 1.1;
    puff.life = 0.7;
    puff.vy = -20;
  }

  private stepActor(actor: Actor, dt: number): void {
    actor.t += dt;
    if (actor.stage === 'tumble') this.stepTumble(actor, dt);
    else if (actor.stage === 'dance') this.stepDance(actor);
    else this.stepFlight(actor);
  }

  private stepTumble(actor: Actor, dt: number): void {
    actor.vy += 900 * dt;
    actor.x = this.keepInside(actor.x + actor.vx * dt, this.unit);
    actor.y += actor.vy * dt;
    actor.rot += 9 * dt;
    if (actor.t < TUMBLE_S) return;
    actor.stage = 'dance';
    actor.t = 0;
    actor.rot = 0;
    actor.groundY = Math.max(this.unit, Math.min(this.floor - this.unit, actor.y));
  }

  private stepDance(actor: Actor): void {
    const beat = actor.t * 10;
    const size = this.calm ? 0.3 : 1;
    actor.y = actor.groundY - Math.abs(Math.sin(beat)) * 28 * size;
    actor.rot = Math.sin(beat) * 0.32 * size;
    if (actor.t >= actor.danceFor) this.takeOff(actor);
  }

  private stepFlight(actor: Actor): void {
    const progress = Math.min(1, actor.t / FLY_S);
    const eased = progress * progress;
    actor.x = actor.fromX + (actor.toX - actor.fromX) * eased;
    actor.y = actor.fromY + (actor.toY - actor.fromY) * eased;
    actor.rot += 0.1;
    if (progress < 1) return;
    actor.alive = false;
    if (!actor.toShelf) return;
    this.onShelf.add(actor.friend);
    this.hops[INDEX_OF.get(actor.friend)!] = 1;
    this.emit({ type: 'landed' });
    if (this.onShelf.size === FRIENDS.length) this.everyoneHome = true;
  }

  /** Where the finger hint points: the first bubble, until the first tap. */
  hintBubble(): Bubble | null {
    if (!this.waitingForTap) return null;
    return this.bubbles.find((bubble) => bubble.alive) ?? null;
  }

  isRareSlot(index: number): boolean {
    return IS_RARE.get(FRIENDS[index]!.id) === true;
  }
}
