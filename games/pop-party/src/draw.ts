import { GIANT_TAPS } from './bubbles.ts';
import { FRIENDS } from './friends.ts';
import { slotCentre } from './shelf.ts';
import type { Sprites } from './sprites.ts';
import { COLORS, type Actor, type Bubble, type World } from './world.ts';

const FLAGS = ['#ff6b6b', '#ffc93c', '#3ecf8e', '#4cb8ff', '#8b5cf6', '#ff7ac6'];
const GIANT_FACES = ['🙂', '😮', '😲', '😆'];
const FLAG_HEIGHT = 20;

type Ctx = CanvasRenderingContext2D;

/** Places a picture without the slow save and restore, which adds up over dozens of bubbles a frame. */
function place(ctx: Ctx, dpr: number, x: number, y: number, scaleX: number, scaleY: number, turn: number): void {
  const cos = Math.cos(turn) * dpr;
  const sin = Math.sin(turn) * dpr;
  ctx.setTransform(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x * dpr, y * dpr);
}

function bubbleSprite(bubble: Bubble, sprites: Sprites): HTMLCanvasElement {
  switch (bubble.kind) {
    case 'golden':
      return sprites.gold;
    case 'rainbow':
      return sprites.rainbow;
    case 'sleepy':
      return sprites.sleepy;
    case 'toot':
      return sprites.toot;
    default:
      return sprites.colors[bubble.color]!;
  }
}

function bubbleFace(bubble: Bubble): string | null {
  if (bubble.kind === 'giant') return GIANT_FACES[Math.min(bubble.taps, GIANT_TAPS - 1)]!;
  if (bubble.kind === 'sleepy') return bubble.state === 'sneeze' ? '🤧' : '😴';
  if (bubble.kind === 'toot') return '😜';
  if (bubble.kind === 'golden') return '🌟';
  return null;
}

function drawBubble(ctx: Ctx, world: World, sprites: Sprites, dpr: number, bubble: Bubble): void {
  const { r, x, y, age, phase } = bubble;
  const shake = bubble.state === 'sneeze' ? 3 : 1;
  const stretch = world.calm ? 0 : Math.sin(age * (3 + bubble.wobble) + phase) * (0.035 + bubble.wobble * 0.03) * shake;
  const spin = bubble.kind === 'rainbow' ? age * 0.8 : 0;
  place(ctx, dpr, x, y, 1 + stretch, 1 - stretch, spin);
  ctx.drawImage(bubbleSprite(bubble, sprites), -r, -r, r * 2, r * 2);
  if (bubble.flash > 0) {
    ctx.globalAlpha = bubble.flash * 0.7;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const face = bubbleFace(bubble);
  if (!face) return;
  const size = r * (bubble.kind === 'golden' ? 1.05 : 1.2);
  const tilt = bubble.state === 'zoom' ? age * 8 : Math.sin(age * 2 + phase) * 0.12;
  place(ctx, dpr, x, y, 1 + stretch, 1 - stretch, tilt);
  ctx.drawImage(sprites.emoji(face), -size / 2, -size / 2, size, size);
  if (bubble.kind === 'sleepy' && bubble.state === 'float') drawSnore(ctx, sprites, dpr, bubble);
}

function drawSnore(ctx: Ctx, sprites: Sprites, dpr: number, bubble: Bubble): void {
  const rise = (bubble.age * 0.6) % 1;
  const size = bubble.r * (0.45 + rise * 0.4);
  ctx.globalAlpha = 1 - rise;
  place(ctx, dpr, bubble.x + bubble.r * 0.75, bubble.y - bubble.r * (0.75 + rise * 0.8), 1, 1, 0);
  ctx.drawImage(sprites.emoji('💤'), -size / 2, -size / 2, size, size);
  ctx.globalAlpha = 1;
}

function drawBubbles(ctx: Ctx, world: World, sprites: Sprites, dpr: number): void {
  for (const bubble of world.bubbles) if (bubble.alive) drawBubble(ctx, world, sprites, dpr, bubble);
}

function drawParticles(ctx: Ctx, world: World, sprites: Sprites, dpr: number): void {
  for (const piece of world.particles) {
    if (!piece.alive) continue;
    const left = 1 - piece.age / piece.life;
    switch (piece.look) {
      case 'dot':
        ctx.globalAlpha = left;
        ctx.fillStyle = piece.color;
        place(ctx, dpr, piece.x, piece.y, 1, 1, 0);
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
        break;
      case 'confetti':
        ctx.fillStyle = piece.color;
        ctx.globalAlpha = Math.min(1, left * 4);
        place(ctx, dpr, piece.x, piece.y, 1, 1, piece.turn);
        ctx.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.66);
        break;
      case 'ring':
        ctx.globalAlpha = left;
        ctx.strokeStyle = piece.color;
        ctx.lineWidth = 3 + left * 6;
        place(ctx, dpr, piece.x, piece.y, 1, 1, 0);
        ctx.beginPath();
        ctx.arc(0, 0, piece.size * (1 + (1 - left) * 0.7), 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'puff': {
        const size = piece.size * (1.4 - left * 0.6);
        ctx.globalAlpha = left;
        place(ctx, dpr, piece.x, piece.y, 1, 1, 0);
        ctx.drawImage(sprites.emoji('💨'), -size / 2, -size / 2, size, size);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawActor(ctx: Ctx, world: World, sprites: Sprites, dpr: number, actor: Actor): void {
  const flying = actor.stage === 'fly' && actor.toShelf ? 1 - Math.min(1, actor.t / 0.55) * 0.5 : 1;
  const size = world.unit * 1.5 * actor.scale * flying;
  place(ctx, dpr, actor.x, actor.y, 1, 1, actor.rot);
  ctx.drawImage(sprites.emoji(actor.emoji), -size / 2, -size / 2, size, size);
}

function drawShelf(ctx: Ctx, world: World, sprites: Sprites, dpr: number): void {
  const { shelf, floor, height, width } = world;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#f2c88f';
  ctx.fillRect(0, floor, width, shelf.height);
  ctx.fillStyle = '#c98f52';
  ctx.fillRect(0, floor, width, 6);
  const size = shelf.slot * 0.84;
  FRIENDS.forEach((friend, index) => {
    const { x, y } = slotCentre(shelf, index, height);
    if (world.isRareSlot(index)) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#ffe48a';
      ctx.beginPath();
      ctx.arc(x, y, shelf.slot * 0.46, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!world.onShelf.has(friend.id)) {
      ctx.globalAlpha = 0.24;
      place(ctx, dpr, x, y, 1, 1, 0);
      ctx.drawImage(sprites.shadow(friend.emoji), -size / 2, -size / 2, size, size);
      ctx.globalAlpha = 1;
      return;
    }
    const hop = world.hops[index]!;
    const wave = world.partyLeft > 0 && !world.calm ? Math.abs(Math.sin(world.time * 9 + index * 0.7)) * 0.32 : 0;
    const lift = Math.sin(hop * Math.PI) * 0.45 + wave;
    place(ctx, dpr, x, y - lift * shelf.slot, 1 + hop * 0.25, 1 + hop * 0.25, Math.sin(hop * 12) * 0.2 * hop);
    ctx.drawImage(sprites.emoji(friend.emoji), -size / 2, -size / 2, size, size);
  });
}

/** Little flags along the top that light up pop by pop, so a party is something to look forward to. */
function drawBunting(ctx: Ctx, world: World, dpr: number): void {
  const { width, goal, meter, partyLeft, time } = world;
  const gap = width / goal;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = 0; i < goal; i++) {
    const lit = partyLeft > 0 || i < meter;
    const dance = partyLeft > 0 && !world.calm ? Math.sin(time * 12 + i) * 5 : 0;
    ctx.globalAlpha = lit ? 1 : 0.6;
    ctx.fillStyle = lit ? FLAGS[(i + (partyLeft > 0 ? Math.floor(time * 8) : 0)) % FLAGS.length]! : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(i * gap + 2, 0);
    ctx.lineTo((i + 1) * gap - 2, 0);
    ctx.lineTo((i + 0.5) * gap, FLAG_HEIGHT + dance);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A soft rainbow glow over the sky while it rains bubbles. */
function drawRainGlow(ctx: Ctx, world: World, dpr: number): void {
  if (world.rainLeft <= 0) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = Math.min(0.28, world.rainLeft * 0.3);
  const glow = ctx.createLinearGradient(0, 0, world.width, 0);
  COLORS.forEach((color, index) => glow.addColorStop(index / (COLORS.length - 1), color));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, world.width, world.floor);
  ctx.globalAlpha = 1;
}

function drawHint(ctx: Ctx, world: World, sprites: Sprites, dpr: number): void {
  const bubble = world.hintBubble();
  if (!bubble) return;
  const size = world.unit * 1.5;
  const bob = world.calm ? 0 : Math.abs(Math.sin(world.time * 4)) * 16;
  const belowRoom = bubble.y + bubble.r + size < world.floor;
  const y = belowRoom ? bubble.y + bubble.r + size * 0.45 + bob : bubble.y - bubble.r - size * 0.45 - bob;
  place(ctx, dpr, bubble.x, y, 1, belowRoom ? 1 : -1, 0);
  ctx.drawImage(sprites.emoji('👆'), -size / 2, -size / 2, size, size);
}

export function drawWorld(ctx: Ctx, world: World, sprites: Sprites, dpr: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawRainGlow(ctx, world, dpr);
  drawBubbles(ctx, world, sprites, dpr);
  drawBunting(ctx, world, dpr);
  drawShelf(ctx, world, sprites, dpr);
  drawParticles(ctx, world, sprites, dpr);
  for (const actor of world.actors) if (actor.alive) drawActor(ctx, world, sprites, dpr, actor);
  drawHint(ctx, world, sprites, dpr);
}
