import type { Color, Eyes, Hair, Hat, Held, Look, Mouth, Part, Shape } from './parts.ts';

/**
 * Draws a creature as SVG text. Each body shape states where its head, face and
 * arms are, and every part is drawn around its own (0, 0) and placed at one of
 * those anchors, so any combination lines up. It also means CSS can spin a part
 * around (0, 0), which is the SVG default.
 */

interface ColorSpec {
  fill: string;
  /** A plain color for tiles and small shapes, where a gradient has nothing to hang on to. */
  base: string;
  dark: string;
  light: string;
  accent: string;
  ink: string;
  backdrop: string;
}

const INK = '#3b2247';

export const COLOR_SPECS: Record<Color, ColorSpec> = {
  teal: { fill: '#2ec4b6', base: '#2ec4b6', dark: '#1b998b', light: '#b4f0e9', accent: '#ff7a6b', ink: INK, backdrop: '#ffe9c9' },
  coral: { fill: '#ff8370', base: '#ff8370', dark: '#d9513f', light: '#ffd8cf', accent: '#3f8ee8', ink: INK, backdrop: '#d6f3f7' },
  sun: { fill: '#ffc93c', base: '#ffc93c', dark: '#e0a100', light: '#fff2c2', accent: '#8b5cf6', ink: INK, backdrop: '#e4e0ff' },
  grape: { fill: '#a07bf5', base: '#a07bf5', dark: '#7245cc', light: '#e2d5ff', accent: '#ffc93c', ink: INK, backdrop: '#fff0c9' },
  leaf: { fill: '#74d857', base: '#74d857', dark: '#44a82d', light: '#d6f6ca', accent: '#ff6f91', ink: INK, backdrop: '#ffe3ea' },
  sky: { fill: '#58bdff', base: '#58bdff', dark: '#2483c7', light: '#cdeaff', accent: '#ff9f1c', ink: INK, backdrop: '#fff0d4' },
  gold: { fill: 'url(#sf-gold)', base: '#f4c430', dark: '#b8860b', light: '#fff4bf', accent: '#c2410c', ink: INK, backdrop: '#fdf1c7' },
  rainbow: { fill: 'url(#sf-rainbow)', base: '#ff8fb1', dark: '#7a5cd6', light: '#ffffff', accent: '#3f8ee8', ink: INK, backdrop: '#eef6ff' },
  galaxy: { fill: 'url(#sf-galaxy)', base: '#3b2f9e', dark: '#241a6b', light: '#6f5fe0', accent: '#58e6d9', ink: '#fff6e0', backdrop: '#d7d4f7' },
};

const GRADIENTS: Partial<Record<Color, string>> = {
  gold: `<linearGradient id="sf-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".5" stop-color="#f4c430"/><stop offset="1" stop-color="#ffdd55"/></linearGradient>`,
  rainbow: `<linearGradient id="sf-rainbow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a6b"/><stop offset=".22" stop-color="#ffc93c"/><stop offset=".44" stop-color="#74d857"/><stop offset=".66" stop-color="#58bdff"/><stop offset=".85" stop-color="#a07bf5"/><stop offset="1" stop-color="#ff8fb1"/></linearGradient>`,
  galaxy: `<radialGradient id="sf-galaxy" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#6f5fe0"/><stop offset=".6" stop-color="#3b2f9e"/><stop offset="1" stop-color="#241a6b"/></radialGradient>`,
};

const GALAXY_STARS = [
  [118, 190], [244, 176], [96, 330], [264, 342], [150, 380], [214, 392], [176, 150], [86, 262], [272, 262],
];

interface Build {
  /** Top of the head on the middle line. Hair sits here. */
  top: number;
  /** Where the brim of a hat sits. */
  hatY: number;
  eyeY: number;
  mouthY: number;
  armY: number;
  /** Shoulder distance from the middle line. */
  armX: number;
  footX: number;
  belly: readonly [cy: number, rx: number, ry: number];
  outline: (fill: string) => string;
}

const path = (d: string) => (fill: string) => `<path d="${d}" fill="${fill}"/>`;

const CLOUD_PUFFS = [
  [180, 268, 124], [95, 192, 60], [180, 158, 68], [265, 192, 60], [66, 282, 62], [294, 282, 62], [100, 362, 52], [260, 362, 52], [180, 362, 58],
] as const;

export const BUILDS: Record<Shape, Build> = {
  round: {
    top: 122, hatY: 138, eyeY: 232, mouthY: 306, armY: 300, armX: 128, footX: 74, belly: [352, 82, 46],
    outline: path('M180 122C268 122 322 192 322 272C322 354 262 412 180 412C98 412 38 354 38 272C38 192 92 122 180 122Z'),
  },
  tall: {
    top: 72, hatY: 88, eyeY: 192, mouthY: 266, armY: 300, armX: 96, footX: 62, belly: [350, 66, 50],
    outline: path('M180 72C246 72 282 124 282 192L286 340C286 388 246 412 180 412C114 412 74 388 74 340L78 192C78 124 114 72 180 72Z'),
  },
  pear: {
    top: 116, hatY: 132, eyeY: 208, mouthY: 276, armY: 318, armX: 126, footX: 84, belly: [356, 96, 40],
    outline: path('M180 116C240 116 264 164 272 216C280 264 338 298 338 350C338 396 266 412 180 412C94 412 22 396 22 350C22 298 80 264 88 216C96 164 120 116 180 116Z'),
  },
  cloud: {
    top: 90, hatY: 106, eyeY: 228, mouthY: 304, armY: 312, armX: 136, footX: 80, belly: [358, 78, 40],
    outline: (fill) => CLOUD_PUFFS.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`).join(''),
  },
};

interface Spot {
  x: number;
  y: number;
  r: number;
}

const EYE_SPOTS: Record<Eyes, readonly Spot[]> = {
  friendly: [{ x: -52, y: 0, r: 32 }, { x: 52, y: 0, r: 32 }],
  one: [{ x: 0, y: 0, r: 52 }],
  three: [{ x: -64, y: 10, r: 26 }, { x: 0, y: -16, r: 29 }, { x: 64, y: 10, r: 26 }],
  googly: [{ x: -54, y: 0, r: 40 }, { x: 50, y: -6, r: 28 }],
  sleepy: [{ x: -52, y: 4, r: 33 }, { x: 52, y: 4, r: 33 }],
  sparkly: [{ x: -54, y: 0, r: 39 }, { x: 54, y: 0, r: 39 }],
};

const PUPIL_DARK = '#2b2140';

function pupil(kind: Eyes, r: number): string {
  if (kind === 'sparkly') {
    return (
      `<circle r="${r * 0.74}" fill="${PUPIL_DARK}"/>` +
      `<path class="twinkle" transform="translate(${-r * 0.28} ${-r * 0.3}) scale(${r / 34})" d="M0-12Q2-2 12 0Q2 2 0 12Q-2 2-12 0Q-2-2 0-12Z" fill="#fff"/>` +
      `<circle cx="${r * 0.3}" cy="${r * 0.28}" r="${r * 0.13}" fill="#fff"/>`
    );
  }
  const size = kind === 'googly' ? 0.42 : 0.56;
  return `<circle r="${r * size}" fill="${PUPIL_DARK}"/><circle cx="${-r * 0.16}" cy="${-r * 0.2}" r="${r * 0.15}" fill="#fff"/>`;
}

function eyeLid(kind: Eyes, r: number, lid: string): string {
  if (kind !== 'sleepy') return '';
  return `<path d="M${-r - 2} -2A${r + 2} ${r + 2} 0 0 1 ${r + 2} -2L${r + 2} 3L${-r - 2} 3Z" fill="${lid}"/>`;
}

function eye(kind: Eyes, { x, y, r }: Spot, spec: ColorSpec): string {
  const reach = r * (kind === 'googly' ? 0.46 : 0.3);
  return (
    `<g transform="translate(${x} ${y})">` +
    `<g class="eye" style="--reach:${reach.toFixed(1)}px">` +
    `<circle r="${r}" fill="#fff" stroke="${INK}" stroke-opacity=".28" stroke-width="3"/>` +
    `<g class="pupil${kind === 'googly' ? ' pupil-googly' : ''}">${pupil(kind, r)}</g>` +
    eyeLid(kind, r, spec.dark) +
    `</g>` +
    `<path class="eye-happy" d="M${-r * 0.8} 8Q0 ${-r * 0.9} ${r * 0.8} 8" fill="none" stroke="${spec.ink}" stroke-width="9" stroke-linecap="round"/>` +
    `<path class="eye-shut" d="M${-r * 0.75} 0Q0 ${r * 0.4} ${r * 0.75} 0" fill="none" stroke="${spec.ink}" stroke-width="9" stroke-linecap="round"/>` +
    `</g>`
  );
}

function eyesArt(kind: Eyes, spec: ColorSpec): string {
  return EYE_SPOTS[kind].map((spot) => eye(kind, spot, spec)).join('');
}

const TONGUE = '#ff7aa2';

function mouthArt(kind: Mouth, ink: string): string {
  const line = `fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round"`;
  switch (kind) {
    case 'smile':
      return `<path d="M-40 -6Q0 32 40 -6" ${line}/>`;
    case 'huge':
      return (
        `<path d="M-74 -20Q0 -6 74 -20Q68 66 0 66Q-68 66 -74 -20Z" fill="#5a1e3d"/>` +
        `<path d="M-64 -16Q0 -4 64 -16L60 2Q0 12 -60 2Z" fill="#fff"/>` +
        `<ellipse cy="48" rx="34" ry="17" fill="${TONGUE}"/>`
      );
    case 'fangs':
      return (
        `<path d="M-58 -10Q0 8 58 -10Q44 40 0 40Q-44 40 -58 -10Z" fill="#5a1e3d"/>` +
        `<path d="M-40 -5L-26 22L-14 0Z" fill="#fff"/><path d="M40 -5L26 22L14 0Z" fill="#fff"/>`
      );
    case 'tongue':
      return (
        `<g class="tongue"><path d="M4 10V34A19 19 0 0 0 42 34V8Z" fill="${TONGUE}"/><path d="M23 12V34" stroke="#e05a87" stroke-width="4" stroke-linecap="round"/></g>` +
        `<path d="M-46 -4Q0 30 50 -4" ${line}/>`
      );
    case 'kissy':
      return (
        `<g class="kiss"><ellipse cx="0" cy="-7" rx="22" ry="13" fill="#ff5d8f"/><ellipse cx="0" cy="11" rx="20" ry="15" fill="#ff5d8f"/>` +
        `<path d="M-14 2Q0 7 14 2" stroke="#c23468" stroke-width="4" fill="none" stroke-linecap="round"/></g>`
      );
    case 'oh':
      return `<ellipse cy="6" rx="20" ry="24" fill="#5a1e3d"/><ellipse cy="19" rx="11" ry="7" fill="${TONGUE}"/>`;
  }
}

function hairArt(kind: Hair, accent: string): { back: string; front: string } {
  const line = `fill="none" stroke="${accent}" stroke-linecap="round"`;
  switch (kind) {
    case 'none':
      return { back: '', front: '' };
    case 'tuft':
      return {
        back: '',
        front: `<path d="M-4 16Q-14 -16 -38 -30M0 16Q-2 -24 6 -52M4 16Q18 -16 40 -26" ${line} stroke-width="17"/>`,
      };
    case 'spikes':
      return {
        back: '',
        front: `<path d="M-78 34L-74 -22L-46 10L-30 -44L-10 6L4 -56L22 6L40 -42L54 10L78 -22L84 36Q0 2 -78 34Z" fill="${accent}" stroke="${accent}" stroke-width="9" stroke-linejoin="round"/>`,
      };
    case 'curls': {
      const puffs = [[-74, 16, 30], [-44, -12, 33], [0, -26, 37], [44, -12, 33], [74, 16, 30]];
      return { back: '', front: puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}"/>`).join('') };
    }
    case 'bunches': {
      const side = (x: number): string =>
        `<path d="M${x * 0.2} 34L${x} 24" ${line} stroke-width="26"/><circle cx="${x}" cy="24" r="42" fill="${accent}"/><circle cx="${x * 0.68}" cy="27" r="11" fill="#ffc93c"/>`;
      return { back: side(-104) + side(104), front: '' };
    }
    case 'horns': {
      const horn = (side: number): string =>
        `<path d="M${side * 70} 50Q${side * 104} -4 ${side * 66} -50Q${side * 60} -10 ${side * 26} 16Z" fill="#ffd98a" stroke="#c9984a" stroke-width="5" stroke-linejoin="round"/>`;
      return { back: horn(-1) + horn(1), front: '' };
    }
  }
}

function emoji(glyph: string, x: number, y: number, size: number, extra = ''): string {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central"${extra}>${glyph}</text>`;
}

function hatArt(kind: Hat): string {
  switch (kind) {
    case 'none':
      return '';
    case 'crown':
      return emoji('👑', 0, -34, 112);
    case 'cowboy':
      return (
        `<path d="M-68 -4Q-74 -84 -30 -88Q0 -72 30 -88Q74 -84 68 -4Z" fill="#a9713a"/>` +
        `<path d="M-68 -26Q0 -10 68 -26L68 -6Q0 8 -68 -6Z" fill="#6b3f1d"/>` +
        `<path d="M-128 -24Q-104 14 0 16Q104 14 128 -24Q84 -2 0 -2Q-84 -2 -128 -24Z" fill="#8a5a2b"/>`
      );
    case 'pirate':
      return (
        `<path d="M-116 8Q-104 -42 -72 -68Q-32 -38 0 -80Q32 -38 72 -68Q104 -42 116 8Q0 -18 -116 8Z" fill="#2b2140" stroke="#ffc93c" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M-20 -14L20 -36M20 -14L-20 -36" stroke="#fff" stroke-width="6" stroke-linecap="round"/>` +
        `<circle cy="-32" r="15" fill="#fff"/><circle cx="-5" cy="-33" r="3.5" fill="#2b2140"/><circle cx="5" cy="-33" r="3.5" fill="#2b2140"/>`
      );
    case 'wizard':
      return (
        `<path d="M-76 8Q-30 -70 4 -128Q20 -146 38 -126Q22 -120 22 -100Q40 -50 76 8Z" fill="#5a45c9"/>` +
        `<ellipse cy="8" rx="108" ry="17" fill="#4533a8"/>` +
        emoji('⭐', -14, -34, 28) +
        emoji('⭐', 24, -66, 22) +
        emoji('⭐', 28, -14, 18)
      );
    case 'flower':
      return emoji('🌼', -64, 30, 82);
    case 'helmet':
      return (
        `<path d="M-94 2Q-94 -88 0 -88Q94 -88 94 2Z" fill="#ffc93c"/>` +
        `<path d="M-16 -87Q0 -89 16 -87V2H-16Z" fill="#ffe28a"/>` +
        `<rect x="-116" y="-8" width="232" height="18" rx="9" fill="#e0a100"/>`
      );
    case 'unicorn':
      return (
        `<g transform="translate(0 18) rotate(6)"><path d="M-26 8L0 -112L26 8Q0 18 -26 8Z" fill="#ffd166" stroke="#e0a100" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M-20 -16Q0 -6 19 -22M-14 -44Q0 -36 13 -50M-8 -72Q0 -66 7 -76" fill="none" stroke="#ff7aa2" stroke-width="6" stroke-linecap="round"/></g>`
      );
    case 'antennae':
      return (
        `<g class="antennae"><path d="M-30 18Q-44 -36 -74 -62M30 18Q44 -36 74 -62" fill="none" stroke="#3b2247" stroke-width="9" stroke-linecap="round"/>` +
        `<circle cx="-76" cy="-66" r="17" fill="#ff7a6b"/><circle cx="76" cy="-66" r="17" fill="#ffc93c"/></g>`
      );
  }
}

/** Where an emoji sits against the hand, which is the arm group's (46, -36). */
const HELD_ART: Record<Exclude<Held, 'none'>, { glyph: string; x: number; y: number; size: number; turn?: number }> = {
  balloon: { glyph: '🎈', x: 30, y: -142, size: 100 },
  icecream: { glyph: '🍦', x: 46, y: -74, size: 88 },
  wrench: { glyph: '🔧', x: 46, y: -62, size: 82 },
  wand: { glyph: '🪄', x: 46, y: -60, size: 84 },
  teddy: { glyph: '🧸', x: 42, y: -62, size: 92 },
  guitar: { glyph: '🎸', x: 36, y: -62, size: 104, turn: 8 },
};

const HAND = { x: 46, y: -36 };

export const HELD_GLYPHS = Object.fromEntries(Object.entries(HELD_ART).map(([id, art]) => [id, art.glyph])) as Record<
  Exclude<Held, 'none'>,
  string
>;

function heldArt(kind: Held): string {
  if (kind === 'none') return '';
  const art = HELD_ART[kind];
  const turn = art.turn ? ` transform="rotate(${art.turn} ${art.x} ${art.y})"` : '';
  const string =
    kind === 'balloon' ? `<path d="M${HAND.x} ${HAND.y}Q${HAND.x + 16} ${HAND.y - 30} ${art.x} ${art.y + 48}" fill="none" stroke="#3b2247" stroke-width="3"/>` : '';
  return `<g class="held">${string}${emoji(art.glyph, art.x, art.y, art.size, turn)}</g>`;
}

function arm(direction: -1 | 1, fill: string): string {
  const reach = direction * HAND.x;
  return `<path d="M0 0Q${reach * 0.8} -4 ${reach} ${HAND.y}" fill="none" stroke="${fill}" stroke-width="34" stroke-linecap="round"/>`;
}

function foot(x: number, fill: string): string {
  return `<g transform="translate(${x} 418)"><g class="foot"><ellipse rx="48" ry="23" fill="${fill}"/><path d="M-16 -8V4M0 -9V5M16 -8V4" stroke="#fff" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/></g></g>`;
}

const CENTER = 180;
/** What the creature stands on, which is what breathing grows from. */
const GROUND = 420;

/** The inside of a creature's <svg>, which replaces cleanly each time a part changes. */
export function creatureInner(look: Look): string {
  const spec = COLOR_SPECS[look.color];
  const build = BUILDS[look.shape];
  const hair = hairArt(look.hair, spec.accent);
  const [bellyY, bellyX, bellyHigh] = build.belly;
  const stars =
    look.color === 'galaxy' ? GALAXY_STARS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff" opacity=".85"/>`).join('') : '';
  const cheeks = [-1, 1]
    .map((side) => `<ellipse cx="${side * 96}" cy="-20" rx="24" ry="15" fill="#ff5d8f"/>`)
    .join('');

  return (
    (GRADIENTS[look.color] ? `<defs>${GRADIENTS[look.color]}</defs>` : '') +
    `<ellipse cx="${CENTER}" cy="434" rx="150" ry="14" fill="#2b2140" opacity=".14"/>` +
    foot(CENTER - build.footX, spec.dark) +
    foot(CENTER + build.footX, spec.dark) +
    `<g transform="translate(${CENTER} ${GROUND})"><g class="breath"><g transform="translate(${-CENTER} ${-GROUND})">` +
    `<g class="part-hair" transform="translate(${CENTER} ${build.top})">${hair.back}</g>` +
    `<g transform="translate(${CENTER - build.armX} ${build.armY})"><g class="arm arm-left">${arm(-1, spec.dark)}</g></g>` +
    `<g class="part-body">${build.outline(spec.fill)}</g>` +
    `<ellipse cx="${CENTER}" cy="${bellyY}" rx="${bellyX}" ry="${bellyHigh}" fill="${spec.light}" opacity=".75"/>` +
    stars +
    `<g class="part-hair" transform="translate(${CENTER} ${build.top})">${hair.front}</g>` +
    `<g transform="translate(${CENTER} ${build.mouthY})">` +
    `<g class="cheeks" opacity=".3">${cheeks}</g><g class="blush">${cheeks}</g>` +
    `<g class="mouth-look">${mouthArt(look.mouth, spec.ink)}</g>` +
    `<g class="mouth-open"><ellipse cy="10" rx="34" ry="38" fill="#5a1e3d"/><ellipse cy="30" rx="20" ry="11" fill="${TONGUE}"/></g>` +
    `</g>` +
    `<g class="part-eyes" transform="translate(${CENTER} ${build.eyeY})">${eyesArt(look.eyes, spec)}</g>` +
    `<g class="part-hat" transform="translate(${CENTER} ${build.hatY})"><g class="hat-fly">${hatArt(look.hat)}</g></g>` +
    `<g transform="translate(${CENTER + build.armX} ${build.armY})"><g class="arm arm-right">${heldArt(look.held)}${arm(1, spec.dark)}</g></g>` +
    `</g></g></g>`
  );
}

const VIEW_BOX = '-30 -60 420 505';

/** A whole creature. `phase` starts its idle loops part-way through, so friends don't blink in step. */
export function creatureSvg(look: Look, phase = 0): string {
  return `<svg class="creature" viewBox="${VIEW_BOX}" style="--phase:${-phase}s" aria-hidden="true">${creatureInner(look)}</svg>`;
}

export const POINTS = {
  mouth: (look: Look) => ({ x: CENTER, y: BUILDS[look.shape].mouthY }),
  eyes: (look: Look) => ({ x: CENTER, y: BUILDS[look.shape].eyeY }),
  top: (look: Look) => ({ x: CENTER, y: BUILDS[look.shape].top }),
  behind: () => ({ x: 30, y: 400 }),
};

const HEAD = (fill: string): string => `<circle cy="104" r="104" fill="${fill}"/>`;

/** An empty dashed ring: the picture for "nothing here". */
const NOTHING = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="#5d5375" stroke-width="6" stroke-dasharray="11 10" stroke-linecap="round"/></svg>`;

function pictureOf<P extends Part>(part: P, id: Look[P], look: Look): string {
  const spec = COLOR_SPECS[look.color];
  switch (part) {
    case 'shape': {
      const shape = id as Shape;
      return `<svg viewBox="-20 70 400 360">${GRADIENTS[look.color] ? `<defs>${GRADIENTS[look.color]}</defs>` : ''}${BUILDS[shape].outline(spec.fill)}</svg>`;
    }
    case 'color':
      return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="${COLOR_SPECS[id as Color].base}"/><ellipse cx="38" cy="36" rx="12" ry="8" fill="#fff" opacity=".5"/></svg>`;
    case 'eyes':
      return `<svg viewBox="-100 -68 200 136">${eyesArt(id as Eyes, spec)}</svg>`;
    case 'mouth':
      return `<svg viewBox="-92 -46 184 126">${mouthArt(id as Mouth, INK)}</svg>`;
    case 'hair': {
      const hair = hairArt(id as Hair, spec.accent);
      return `<svg viewBox="-150 -70 300 180">${hair.back}${HEAD(spec.base)}${hair.front}</svg>`;
    }
    case 'hat':
      return `<svg viewBox="-140 -150 280 230">${HEAD(spec.base)}${hatArt(id as Hat)}</svg>`;
    case 'held':
      return `<span class="tile-emoji">${HELD_GLYPHS[id as Exclude<Held, 'none'>]}</span>`;
    default:
      return '';
  }
}

/** The small picture on an option tile. */
export function optionPicture<P extends Part>(part: P, id: Look[P], look: Look): string {
  return id === 'none' ? NOTHING : pictureOf(part, id, look);
}

/** The picture on a tab: the part itself, drawn on the current creature's color. */
export const TAB_PICTURES = {
  body: (look: Look) => optionPicture('shape', look.shape, look),
  eyes: (look: Look) => optionPicture('eyes', 'friendly', look),
  mouth: (look: Look) => optionPicture('mouth', 'tongue', look),
  hair: (look: Look) => optionPicture('hair', 'spikes', look),
  hat: (look: Look) => optionPicture('hat', 'cowboy', look),
  held: () => '<span class="tile-emoji">🎈</span>',
};
