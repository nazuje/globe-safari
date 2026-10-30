import type { MemberId } from './band.ts';

// The six musicians, drawn as inline SVG so a mouth can really open. In each
// drawing .mouth is opened by the tap reaction, and .eye blinks.

const INK = '#2b2140';

function eye(x: number, y: number, r: number, fill = '#fff'): string {
  return `<g class="eye"><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="2.5"/><circle cx="${x + r * 0.15}" cy="${y + r * 0.15}" r="${r * 0.52}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.1}" r="${r * 0.17}" fill="#fff"/></g>`;
}

function mouth(x: number, y: number, rx: number, ry: number): string {
  return `<g class="mouth"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#7a1f3d" stroke="${INK}" stroke-width="2.5"/><ellipse cx="${x}" cy="${y + ry * 0.5}" rx="${rx * 0.6}" ry="${ry * 0.42}" fill="#ff7e93"/></g>`;
}

const FROG = `
  <ellipse cx="60" cy="122" rx="38" ry="5" fill="#0003"/>
  <circle cx="36" cy="40" r="17" fill="#45c985" stroke="${INK}" stroke-width="3"/>
  <circle cx="84" cy="40" r="17" fill="#45c985" stroke="${INK}" stroke-width="3"/>
  <ellipse cx="60" cy="80" rx="48" ry="40" fill="#45c985" stroke="${INK}" stroke-width="3"/>
  <ellipse cx="60" cy="96" rx="30" ry="20" fill="#c8f5d6"/>
  <circle cx="24" cy="76" r="5" fill="#ff9eb5"/><circle cx="96" cy="76" r="5" fill="#ff9eb5"/>
  ${eye(36, 38, 11)}${eye(84, 38, 11)}
  ${mouth(60, 72, 26, 15)}`;

const ROBOT = `
  <ellipse cx="60" cy="122" rx="34" ry="5" fill="#0003"/>
  <line x1="60" y1="26" x2="60" y2="10" stroke="${INK}" stroke-width="4"/>
  <circle class="spark" cx="60" cy="9" r="7" fill="#ffc93c" stroke="${INK}" stroke-width="3"/>
  <rect x="8" y="50" width="14" height="24" rx="5" fill="#ff8f6b" stroke="${INK}" stroke-width="3"/>
  <rect x="98" y="50" width="14" height="24" rx="5" fill="#ff8f6b" stroke="${INK}" stroke-width="3"/>
  <rect x="38" y="100" width="44" height="18" rx="5" fill="#6fa8d6" stroke="${INK}" stroke-width="3"/>
  <rect x="20" y="26" width="80" height="76" rx="16" fill="#8fd0ff" stroke="${INK}" stroke-width="3"/>
  <rect x="30" y="36" width="60" height="30" rx="12" fill="#2b3a55"/>
  ${eye(46, 51, 10, '#b6ffda')}${eye(74, 51, 10, '#b6ffda')}
  ${mouth(60, 84, 22, 12)}`;

const DINO = `
  <ellipse cx="60" cy="122" rx="40" ry="5" fill="#0003"/>
  <path d="M34 26 44 6 54 22 62 2 72 22 84 8 88 30Z" fill="#ffd166" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M60 18C94 18 106 46 106 76c0 32-20 44-46 44S14 108 14 76C14 46 26 18 60 18Z" fill="#ff9f43" stroke="${INK}" stroke-width="3"/>
  <ellipse cx="60" cy="100" rx="28" ry="18" fill="#ffe0b3"/>
  <circle cx="26" cy="64" r="5" fill="#e07f20"/><circle cx="96" cy="58" r="4" fill="#e07f20"/><circle cx="92" cy="96" r="5" fill="#e07f20"/>
  ${eye(42, 44, 11)}${eye(78, 44, 11)}
  <circle cx="52" cy="60" r="2.5" fill="${INK}"/><circle cx="68" cy="60" r="2.5" fill="${INK}"/>
  <g class="mouth"><ellipse cx="60" cy="80" rx="32" ry="16" fill="#7a1f3d" stroke="${INK}" stroke-width="2.5"/><path d="M40 68 45 77 50 66ZM70 66 75 77 80 68Z" fill="#fff"/></g>`;

const CAT = `
  <ellipse cx="60" cy="122" rx="34" ry="5" fill="#0003"/>
  <path d="M18 56 16 12 54 32Z" fill="#ff9ec7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M102 56 104 12 66 32Z" fill="#ff9ec7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M25 42 24 24 40 33Z M95 42 96 24 80 33Z" fill="#ffd9ea"/>
  <ellipse cx="60" cy="74" rx="48" ry="46" fill="#ff9ec7" stroke="${INK}" stroke-width="3"/>
  <path d="M60 28v14M48 30l2 10M72 30l-2 10" stroke="#e86ea6" stroke-width="4" stroke-linecap="round"/>
  ${eye(40, 62, 11)}${eye(80, 62, 11)}
  <path d="M55 76h10l-5 6Z" fill="#c9446f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M8 74l20 4M6 90l22-3M112 74l-20 4M114 90l-22-3" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
  ${mouth(60, 96, 15, 13)}`;

const ALIEN = `
  <ellipse cx="60" cy="122" rx="30" ry="5" fill="#0003"/>
  <path d="M40 24 28 6M80 24 92 6" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="27" cy="7" r="6" fill="#ff7eb6" stroke="${INK}" stroke-width="2.5"/>
  <circle cx="93" cy="7" r="6" fill="#ff7eb6" stroke="${INK}" stroke-width="2.5"/>
  <path d="M60 16c34 0 50 22 50 46 0 30-30 58-50 58S10 92 10 62c0-24 16-46 50-46Z" fill="#b6ec6e" stroke="${INK}" stroke-width="3"/>
  <g class="eye"><ellipse cx="36" cy="62" rx="17" ry="21" fill="#2b2140" transform="rotate(14 36 62)"/><circle cx="41" cy="54" r="5" fill="#fff"/></g>
  <g class="eye"><ellipse cx="84" cy="62" rx="17" ry="21" fill="#2b2140" transform="rotate(-14 84 62)"/><circle cx="89" cy="54" r="5" fill="#fff"/></g>
  ${mouth(60, 99, 12, 10)}`;

const CHICKEN = `
  <ellipse cx="60" cy="122" rx="32" ry="5" fill="#0003"/>
  <path d="M46 112v8h-8M46 120h8M74 112v8h8M74 120h-8" stroke="#ff9f43" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="46" cy="18" r="9" fill="#ff5a5f" stroke="${INK}" stroke-width="3"/>
  <circle cx="60" cy="12" r="10" fill="#ff5a5f" stroke="${INK}" stroke-width="3"/>
  <circle cx="74" cy="18" r="9" fill="#ff5a5f" stroke="${INK}" stroke-width="3"/>
  <path d="M60 22c30 0 44 28 44 54 0 28-18 42-44 42S16 104 16 76c0-26 14-54 44-54Z" fill="#fff6e0" stroke="${INK}" stroke-width="3"/>
  <path class="wing wing-left" d="M18 66C4 72 2 90 12 100c8-2 14-8 16-18Z" fill="#ffe6ad" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path class="wing wing-right" d="M102 66c14 6 16 24 6 34-8-2-14-8-16-18Z" fill="#ffe6ad" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  ${eye(44, 50, 10)}${eye(76, 50, 10)}
  <g class="mouth beak"><path d="M46 66h28L60 82Z" fill="#ff9f43" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>
  <path d="M60 83c-6 0-7 10 0 14 7-4 6-14 0-14Z" fill="#ff5a5f"/>`;

export const ART: Record<MemberId, string> = {
  frog: FROG,
  robot: ROBOT,
  dino: DINO,
  cat: CAT,
  alien: ALIEN,
  chicken: CHICKEN,
};
