import type { ColorName, Door, Friend, Level, ShapeName } from './rounds.ts';
import type { Accessory } from './stickers.ts';

/** Fill and a deeper edge for each color, so every shape keeps a crisp outline. */
export const PAINT: Record<ColorName, { fill: string; edge: string }> = {
  red: { fill: '#ff6b6b', edge: '#d84545' },
  blue: { fill: '#4cb8ff', edge: '#2483c7' },
  yellow: { fill: '#ffd23f', edge: '#d99a00' },
  green: { fill: '#46d695', edge: '#25976a' },
  purple: { fill: '#a78bfa', edge: '#6f4ae0' },
  orange: { fill: '#ff9f43', edge: '#d9730f' },
  pink: { fill: '#ff8fc7', edge: '#dc5a9b' },
  teal: { fill: '#3fd0d0', edge: '#1d9696' },
};

const STAR =
  'M50 7 L62.3 35.8 L93.7 38.7 L70 59.4 L77 90.1 L50 74 L23 90.1 L30 59.4 L6.3 38.7 L37.7 35.8 Z';

/** Each shape in a 100 by 100 box. Rounded joins soften the corners without changing the shape. */
export const SHAPE_PATHS: Record<ShapeName, string> = {
  circle: 'M50 7 a43 43 0 1 1 0 86 a43 43 0 1 1 0 -86 Z',
  square: 'M12 12 H88 V88 H12 Z',
  triangle: 'M50 8 L95 88 H5 Z',
  star: STAR,
  heart: 'M50 92 C22 70 4 52 4 32 C4 16 16 7 29 7 C38 7 46 12 50 21 C54 12 62 7 71 7 C84 7 96 16 96 32 C96 52 78 70 50 92 Z',
  rectangle: 'M3 26 H97 V76 H3 Z',
  oval: 'M50 21 C78 21 98 34 98 50 C98 66 78 79 50 79 C22 79 2 66 2 50 C2 34 22 21 50 21 Z',
  diamond: 'M50 4 L90 50 L50 96 L10 50 Z',
};

const ARCH = 'M14 96 V50 A36 36 0 0 1 86 50 V96 Z';

interface Anchors {
  eyeY: number;
  eyeGap: number;
  faceScale: number;
  mouthY: number;
  footY: number;
  footGap: number;
  armY: number;
  armX: number;
  topY: number;
}

const ANCHORS: Record<ShapeName, Anchors> = {
  circle: { eyeY: 42, eyeGap: 16, faceScale: 1, mouthY: 60, footY: 96, footGap: 17, armY: 56, armX: 44, topY: 8 },
  square: { eyeY: 42, eyeGap: 17, faceScale: 1, mouthY: 60, footY: 92, footGap: 20, armY: 54, armX: 39, topY: 12 },
  triangle: { eyeY: 56, eyeGap: 12, faceScale: 0.85, mouthY: 72, footY: 92, footGap: 22, armY: 68, armX: 34, topY: 12 },
  star: { eyeY: 46, eyeGap: 10.5, faceScale: 0.8, mouthY: 60, footY: 93, footGap: 21, armY: 42, armX: 44, topY: 10 },
  heart: { eyeY: 37, eyeGap: 16, faceScale: 0.95, mouthY: 53, footY: 90, footGap: 11, armY: 46, armX: 43, topY: 9 },
  rectangle: { eyeY: 43, eyeGap: 19, faceScale: 0.85, mouthY: 59, footY: 80, footGap: 26, armY: 52, armX: 48, topY: 26 },
  oval: { eyeY: 43, eyeGap: 18, faceScale: 0.85, mouthY: 59, footY: 83, footGap: 20, armY: 54, armX: 48, topY: 22 },
  diamond: { eyeY: 43, eyeGap: 11, faceScale: 0.8, mouthY: 59, footY: 99, footGap: 9, armY: 50, armX: 37, topY: 7 },
};

function eye(x: number): string {
  return `<g class="eye" transform="translate(${x} 0)">
    <g class="eye-blink">
      <circle r="9.5" fill="#fff"/>
      <g class="pupil"><circle r="5.6" fill="#2b2140"/><circle cx="2" cy="-2.2" r="2" fill="#fff"/></g>
    </g>
  </g>`;
}

const MOUTHS = `
  <path class="mouth mouth-smile" d="M-11 -2 Q0 10 11 -2" fill="none" stroke="#2b2140" stroke-width="3.6" stroke-linecap="round"/>
  <g class="mouth mouth-open">
    <path d="M-11 -3 Q0 -6 11 -3 Q10 13 0 13 Q-10 13 -11 -3 Z" fill="#7a2748"/>
    <ellipse cy="9" rx="6" ry="3.6" fill="#ff8fa3"/>
  </g>
  <g class="mouth mouth-silly">
    <path d="M-11 -2 Q0 8 11 -2" fill="none" stroke="#2b2140" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M-1 3 h11 v7 a5.5 5.5 0 0 1 -11 0 Z" fill="#ff8fa3" stroke="#d95f7c" stroke-width="1.4"/>
  </g>`;

const HAT = `<path d="M-16 0 L0 -32 L16 0 Z" fill="#ffd23f" stroke="#d99a00" stroke-width="3" stroke-linejoin="round"/>
  <circle cy="-33" r="5" fill="#ff6b6b"/><circle cx="-4" cy="-10" r="2.6" fill="#ff6b6b"/><circle cx="5" cy="-5" r="2.6" fill="#4cb8ff"/>`;
const BOW = `<path d="M0 -6 L-20 -17 V6 Z M0 -6 L20 -17 V6 Z" fill="#ff8fc7" stroke="#dc5a9b" stroke-width="3" stroke-linejoin="round"/>
  <circle cy="-6" r="5.5" fill="#fff" stroke="#dc5a9b" stroke-width="2.5"/>`;
const CROWN = `<path d="M-20 2 V-20 L-9 -8 L0 -24 L9 -8 L20 -20 V2 Z" fill="#ffd23f" stroke="#d99a00" stroke-width="3" stroke-linejoin="round"/>
  <circle cy="-7" r="3.4" fill="#ff6b6b"/>`;

function glasses(gap: number): string {
  const r = 12;
  return `<g fill="none" stroke="#2b2140" stroke-width="3">
    <circle cx="${-gap}" r="${r}"/><circle cx="${gap}" r="${r}"/><path d="M${r - gap} 0 H${gap - r}"/>
  </g>`;
}

function accessoryArt(accessory: Accessory, at: Anchors): string {
  if (accessory === 'none') return '';
  if (accessory === 'glasses') {
    return `<g transform="translate(50 ${at.eyeY}) scale(${at.faceScale})">${glasses(at.eyeGap / at.faceScale)}</g>`;
  }
  const art = { hat: HAT, bow: BOW, crown: CROWN }[accessory];
  return `<g transform="translate(50 ${at.topY + 3})">${art}</g>`;
}

function limbs(at: Anchors, edge: string): string {
  const leftX = 50 - at.armX;
  const rightX = 50 + at.armX;
  return `
    <ellipse cx="${50 - at.footGap}" cy="${at.footY}" rx="12" ry="7" fill="${edge}"/>
    <ellipse cx="${50 + at.footGap}" cy="${at.footY}" rx="12" ry="7" fill="${edge}"/>
    <path class="arm arm-left" d="M${leftX} ${at.armY} q-12 7 -17 21" fill="none" stroke="${edge}" stroke-width="6.5" stroke-linecap="round"/>
    <path class="arm arm-right" d="M${rightX} ${at.armY} q12 7 17 21" fill="none" stroke="${edge}" stroke-width="6.5" stroke-linecap="round"/>`;
}

function face(at: Anchors): string {
  const blush = at.eyeGap + 8;
  return `<g transform="translate(50 ${at.eyeY}) scale(${at.faceScale})">
      ${eye(-at.eyeGap / at.faceScale)}${eye(at.eyeGap / at.faceScale)}
    </g>
    <g transform="translate(50 ${at.mouthY}) scale(${at.faceScale})">
      <ellipse cx="${-blush}" cy="-3" rx="6.5" ry="4" fill="#fff" opacity="0.4"/>
      <ellipse cx="${blush}" cy="-3" rx="6.5" ry="4" fill="#fff" opacity="0.4"/>
      ${MOUTHS}
    </g>`;
}

/** A friend with feet, arms, a face and any costume. Scale it with CSS: it is crisp at any size. */
export function friendSvg(friend: Pick<Friend, 'shape' | 'color'>, accessory: Accessory = 'none'): string {
  const { fill, edge } = PAINT[friend.color];
  const at = ANCHORS[friend.shape];
  const path = SHAPE_PATHS[friend.shape];
  return `<svg class="friend-svg" viewBox="-14 -26 128 136" aria-hidden="true">
    ${limbs(at, edge)}
    <path d="${path}" fill="${fill}" stroke="${edge}" stroke-width="5" stroke-linejoin="round"/>
    <path d="${path}" fill="#fff" opacity="0.12" transform="translate(50 50) scale(0.8) translate(-50 -50)"/>
    ${face(at)}
    ${accessoryArt(accessory, at)}
  </svg>`;
}

/** An empty spot in the sticker book: the friend's outline, waiting. */
export function silhouetteSvg(shape: ShapeName): string {
  return `<svg viewBox="-14 -26 128 136" aria-hidden="true">
    <path d="${SHAPE_PATHS[shape]}" fill="none" stroke="#c9bfd8" stroke-width="5" stroke-linejoin="round" stroke-dasharray="9 9" stroke-linecap="round"/>
  </svg>`;
}

interface DoorLook {
  path: string;
  scale: number;
  /** The point in the door's own box that sits on the house's doorstep. */
  footX: number;
  footY: number;
  line: string;
  lineWidth: number;
  panel: string;
}

const SIZE_SCALE = { big: 0.92, middle: 0.64, small: 0.38 };

function doorLook(door: Door, panel: string): DoorLook {
  if (door.kind === 'shape') {
    return { path: SHAPE_PATHS[door.shape], scale: 0.8, footX: 50, footY: 92, line: '#fff', lineWidth: 6, panel };
  }
  if (door.kind === 'color') {
    const { fill } = PAINT[door.color];
    return { path: ARCH, scale: 0.92, footX: 50, footY: 96, line: fill, lineWidth: 12, panel: fill };
  }
  return { path: ARCH, scale: SIZE_SCALE[door.size], footX: 50, footY: 96, line: '#fff', lineWidth: 6, panel };
}

const HOUSE_TINTS = [
  { wall: '#fff0c9', roof: '#f2a65a', panel: '#e0a15e' },
  { wall: '#ffe0e6', roof: '#e8799a', panel: '#d88aa0' },
  { wall: '#e9e2ff', roof: '#8f7be0', panel: '#a595e0' },
];

const DOORSTEP_Y = 132;

/** A house whose door is cut in the shape it wants, with a panel that swings shut once a friend is in. */
export function houseSvg(door: Door, position: number): string {
  const tint = HOUSE_TINTS[position % HOUSE_TINTS.length];
  const look = doorLook(door, tint.panel);
  const place = `translate(60 ${DOORSTEP_Y}) scale(${look.scale}) translate(${-look.footX} ${-look.footY})`;
  const stroke = `stroke="${look.line}" stroke-width="${look.lineWidth}" stroke-linejoin="round"`;
  return `<svg class="house-svg" viewBox="0 0 120 140" aria-hidden="true">
    <rect class="chimney" x="86" y="10" width="13" height="24" rx="3" fill="${tint.roof}"/>
    <g class="smoke"><circle cx="92" cy="6" r="4"/><circle cx="96" cy="-4" r="5.5"/></g>
    <rect x="12" y="36" width="96" height="100" rx="10" fill="${tint.wall}"/>
    <path d="M3 44 Q60 -18 117 44 Q119 48 114 48 H6 Q1 48 3 44 Z" fill="${tint.roof}"/>
    <g transform="${place}">
      <path d="${look.path}" fill="#3a2f55" ${stroke}/>
      <circle class="door-anchor" cx="50" cy="50" r="1" fill="none"/>
      <g class="door-panel">
        <path d="${look.path}" fill="${look.panel}" ${stroke}/>
        <circle cx="70" cy="54" r="5.5" fill="#fff5d6" stroke="#2b2140" stroke-width="2"/>
      </g>
    </g>
  </svg>`;
}

const LEVEL_PICTURES: Record<Level['id'], { shape: ShapeName; color: ColorName; x: number; y: number; size: number }[]> = {
  1: [
    { shape: 'circle', color: 'red', x: 2, y: 13, size: 18 },
    { shape: 'square', color: 'blue', x: 21, y: 13, size: 18 },
    { shape: 'triangle', color: 'green', x: 40, y: 13, size: 18 },
  ],
  2: [
    { shape: 'star', color: 'yellow', x: 2, y: 13, size: 18 },
    { shape: 'heart', color: 'pink', x: 21, y: 13, size: 18 },
    { shape: 'rectangle', color: 'purple', x: 40, y: 13, size: 18 },
  ],
  3: [
    { shape: 'oval', color: 'orange', x: 2, y: 8, size: 28 },
    { shape: 'diamond', color: 'teal', x: 30, y: 8, size: 28 },
  ],
  4: [
    { shape: 'triangle', color: 'red', x: 1, y: 3, size: 38 },
    { shape: 'triangle', color: 'blue', x: 39, y: 21, size: 20 },
  ],
  5: [
    { shape: 'circle', color: 'yellow', x: 1, y: 3, size: 38 },
    { shape: 'circle', color: 'yellow', x: 39, y: 21, size: 20 },
  ],
};

export function levelPicture(id: Level['id']): string {
  const shapes = LEVEL_PICTURES[id].map(({ shape, color, x, y, size }) => {
    const { fill, edge } = PAINT[color];
    const scale = size / 100;
    return `<path d="${SHAPE_PATHS[shape]}" transform="translate(${x} ${y}) scale(${scale})" fill="${fill}" stroke="${edge}" stroke-width="${2 / scale}" stroke-linejoin="round"/>`;
  });
  return `<svg viewBox="0 0 60 44" aria-hidden="true">${shapes.join('')}</svg>`;
}
