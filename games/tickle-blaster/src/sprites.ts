import {
  paintAlien,
  paintArrow,
  paintBoss,
  paintBubble,
  paintCat,
  paintDot,
  paintFeather,
  paintFinger,
  paintFlame,
  paintGoo,
  paintHandIn,
  paintHelper,
  paintPowerHelper,
  paintPowerMagnet,
  paintPowerTriple,
  paintPowerWave,
  paintShip,
  paintSpark,
  paintStar,
  paintWord,
  type Mood,
  type Painter,
} from './art.ts';
import { FRIENDS, LOOKS, type KindId } from './kinds.ts';
import { SCENERY_PAINTERS } from './sky.ts';

const SNAP = 8;
/** Room around the art, for horns, ears and arms that reach past the box. */
const PADDING = 1.4;

const PAINTERS: Record<string, Painter> = {
  ...SCENERY_PAINTERS,
  ship: paintShip,
  helper: paintHelper,
  flame: paintFlame,
  bubble: paintBubble,
  goo: paintGoo,
  star: paintStar,
  spark: paintSpark,
  cat: paintCat,
  finger: paintFinger,
  arrow: paintArrow,
  'feather:0': paintFeather('#ff9ad5'),
  'feather:1': paintFeather('#ffd43b'),
  'feather:2': paintFeather('#7de0ff'),
  'power:triple': paintPowerTriple,
  'power:wave': paintPowerWave,
  'power:magnet': paintPowerMagnet,
  'power:helper': paintPowerHelper,
  'ha:0': paintWord('ha', '#fff1a8'),
  'ha:1': paintWord('hi', '#ffc2e6'),
  'ha:2': paintWord('hee', '#bdf3ff'),
  'bit:0': paintDot('#ff7ab8'),
  'bit:1': paintDot('#ffd43b'),
  'bit:2': paintDot('#4cc9ff'),
  'bit:3': paintDot('#3ee0a0'),
  'bit:4': paintDot('#b28cff'),
};

const MOODS: readonly Mood[] = ['grumpy', 'smirk', 'laugh'];

function isBoss(kind: KindId): boolean {
  return kind.startsWith('boss');
}

for (const kind of FRIENDS) {
  for (const mood of MOODS) {
    PAINTERS[`alien:${kind}:${mood}`] = isBoss(kind) ? paintBoss(kind, mood) : paintAlien(kind, mood);
  }
  if (isBoss(kind)) PAINTERS[`hand:${kind}`] = paintHandIn(LOOKS[kind].happy);
}

export function alienArt(kind: KindId, mood: Mood): string {
  return `alien:${kind}:${mood}`;
}

const cache = new Map<string, HTMLCanvasElement>();

function paint(art: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.ceil(size * PADDING);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  PAINTERS[art]?.(ctx, size);
  return canvas;
}

/** The canvas for a piece of art at a device-pixel size. Near sizes share one, to keep the cache small. */
export function sprite(art: string, size: number): HTMLCanvasElement {
  const snapped = Math.max(SNAP, Math.ceil(size / SNAP) * SNAP);
  const key = `${art}|${snapped}`;
  let found = cache.get(key);
  if (!found) {
    found = paint(art, snapped);
    cache.set(key, found);
  }
  return found;
}

/** Stamps art centered on a point, at a size in the context's own units. */
export function stamp(ctx: CanvasRenderingContext2D, dpr: number, art: string, x: number, y: number, size: number, angle = 0): void {
  const image = sprite(art, size * dpr);
  const box = size * PADDING;
  if (angle === 0) {
    ctx.drawImage(image, x - box / 2, y - box / 2, box, box);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(image, -box / 2, -box / 2, box, box);
  ctx.restore();
}

/** A picture as a page element, for the menus. */
export function artIcon(art: string, size: number, className = 'art'): HTMLCanvasElement {
  const canvas = paint(art, size * 2);
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}
