import { itemById, type DinoId, type Piece } from './catalog.ts';

// Everything that isn't an emoji is drawn here as a small SVG, so it looks the same on every tablet.

const svg = (viewBox: string, inner: string, className = ''): string =>
  `<svg class="${className}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${inner}</svg>`;

export const DIGGER = svg(
  '0 0 110 120',
  `<g class="pick">
     <rect x="83" y="26" width="7" height="58" rx="3.5" fill="#a0693a" transform="rotate(14 86 55)"/>
     <path d="M71 28 Q95 8 108 40 Q94 24 71 28Z" fill="#8d97a8" stroke="#5f6a7c" stroke-width="2"/>
   </g>
   <ellipse cx="50" cy="112" rx="26" ry="5" fill="#0003"/>
   <rect x="30" y="94" width="14" height="18" rx="7" fill="#c95f2c"/>
   <rect x="56" y="94" width="14" height="18" rx="7" fill="#c95f2c"/>
   <ellipse cx="50" cy="72" rx="34" ry="36" fill="#ff9a56"/>
   <ellipse cx="50" cy="84" rx="20" ry="20" fill="#ffd0a6"/>
   <circle cx="37" cy="62" r="10" fill="#fff"/><circle cx="63" cy="62" r="10" fill="#fff"/>
   <circle cx="39" cy="63" r="5" fill="#2b2140"/><circle cx="61" cy="63" r="5" fill="#2b2140"/>
   <circle cx="41" cy="61" r="1.8" fill="#fff"/><circle cx="63" cy="61" r="1.8" fill="#fff"/>
   <path d="M38 80 Q50 92 62 80" fill="none" stroke="#2b2140" stroke-width="3.5" stroke-linecap="round"/>
   <rect x="74" y="66" width="20" height="10" rx="5" fill="#ff9a56" transform="rotate(-30 84 71)"/>
   <path d="M14 46 Q16 12 50 12 Q84 12 86 46Z" fill="#ffc93c" stroke="#d99a00" stroke-width="3"/>
   <rect x="8" y="42" width="84" height="9" rx="4.5" fill="#ffc93c" stroke="#d99a00" stroke-width="3"/>
   <rect x="44" y="12" width="12" height="32" rx="5" fill="#ffe28a"/>`,
  'digger-art',
);

const gem = (color: string): string =>
  svg(
    '0 0 100 100',
    `<path d="M26 16H74L96 40L50 92L4 40Z" fill="${color}"/>
     <path d="M26 16L36 40H4Z" fill="#fff" opacity=".35"/>
     <path d="M74 16L64 40H96Z" fill="#000" opacity=".12"/>
     <path d="M36 40H64L50 92Z" fill="#fff" opacity=".28"/>
     <path d="M4 40H36L50 92Z" fill="#000" opacity=".08"/>
     <path d="M26 16H74L64 40H36Z" fill="#fff" opacity=".5"/>
     <path d="M26 16H74L96 40L50 92L4 40Z" fill="none" stroke="#2b2140" stroke-opacity=".3" stroke-width="3" stroke-linejoin="round"/>`,
  );

const COIN = svg(
  '0 0 100 100',
  `<circle cx="50" cy="50" r="44" fill="#f5b81f" stroke="#c98a00" stroke-width="5"/>
   <circle cx="50" cy="50" r="32" fill="#ffd859" stroke="#d99a00" stroke-width="3"/>
   <path d="M50 26L57 42H74L61 53L66 71L50 61L34 71L39 53L26 42H43Z" fill="#f5b81f" stroke="#c98a00" stroke-width="3" stroke-linejoin="round"/>`,
);

const crown = (color: string): string =>
  svg(
    '0 0 100 100',
    `<path d="M10 74L6 28L30 50L50 16L70 50L94 28L90 74Z" fill="${color}" stroke="#2b2140" stroke-opacity=".3" stroke-width="4" stroke-linejoin="round"/>
     <rect x="10" y="72" width="80" height="14" rx="6" fill="#ffd859" stroke="#2b2140" stroke-opacity=".3" stroke-width="3"/>
     <circle cx="50" cy="16" r="7" fill="#ffd859"/><circle cx="6" cy="28" r="6" fill="#ffd859"/><circle cx="94" cy="28" r="6" fill="#ffd859"/>`,
  );

const KITE = svg(
  '0 0 100 100',
  `<path d="M50 6L84 44L50 76L16 44Z" fill="#ff6b6b"/>
   <path d="M50 6L84 44H16Z" fill="#ffc93c"/>
   <path d="M50 6V76M16 44H84" stroke="#2b2140" stroke-opacity=".4" stroke-width="3"/>
   <path d="M50 76Q60 84 48 88Q38 92 50 98" fill="none" stroke="#4cb8ff" stroke-width="5" stroke-linecap="round"/>`,
);

const PEARL = svg(
  '0 0 100 100',
  `<path d="M8 60Q50 110 92 60Q70 74 50 74Q30 74 8 60Z" fill="#e88fb0"/>
   <circle cx="50" cy="50" r="24" fill="#fbf4ff"/>
   <circle cx="42" cy="42" r="7" fill="#fff"/>`,
);

export const MOLE = svg(
  '0 0 100 100',
  `<ellipse cx="50" cy="62" rx="36" ry="38" fill="#8d6e63"/>
   <ellipse cx="50" cy="74" rx="22" ry="24" fill="#b39a8d"/>
   <circle cx="24" cy="30" r="9" fill="#8d6e63"/><circle cx="76" cy="30" r="9" fill="#8d6e63"/>
   <path d="M28 44Q36 38 44 44M56 44Q64 38 72 44" fill="none" stroke="#2b2140" stroke-width="3.5" stroke-linecap="round"/>
   <ellipse cx="50" cy="56" rx="10" ry="7" fill="#ff9db0"/>
   <ellipse class="mole-mouth" cx="50" cy="74" rx="9" ry="5" fill="#5b2a3a"/>
   <ellipse cx="18" cy="84" rx="11" ry="7" fill="#ffc9b5"/><ellipse cx="82" cy="84" rx="11" ry="7" fill="#ffc9b5"/>`,
  'mole-art',
);

export const WORM = svg(
  '0 0 100 100',
  `<path class="worm-body" d="M12 80Q24 50 38 74T64 70Q72 60 72 40" fill="none" stroke="#ff9db0" stroke-width="20" stroke-linecap="round"/>
   <path d="M12 80Q24 50 38 74T64 70" fill="none" stroke="#f47c96" stroke-width="20" stroke-dasharray="2 13" stroke-linecap="butt"/>
   <circle cx="66" cy="34" r="6" fill="#fff"/><circle cx="80" cy="34" r="6" fill="#fff"/>
   <circle cx="67" cy="35" r="3" fill="#2b2140"/><circle cx="79" cy="35" r="3" fill="#2b2140"/>
   <path d="M66 46Q73 54 80 46" fill="none" stroke="#2b2140" stroke-width="3" stroke-linecap="round"/>`,
  'worm-art',
);

export const CHEST = svg(
  '0 0 120 110',
  `<g class="chest-glow"><circle cx="60" cy="54" r="52" fill="#fff3b0" opacity=".85"/></g>
   <rect x="12" y="50" width="96" height="52" rx="8" fill="#e8a317" stroke="#a86f00" stroke-width="4"/>
   <rect x="12" y="62" width="96" height="9" fill="#ffd859"/>
   <rect x="24" y="50" width="11" height="52" fill="#ffd859"/><rect x="85" y="50" width="11" height="52" fill="#ffd859"/>
   <g class="chest-lid">
     <path d="M12 52V38Q12 12 40 12H80Q108 12 108 38V52Z" fill="#f5b81f" stroke="#a86f00" stroke-width="4"/>
     <rect x="24" y="12" width="11" height="40" fill="#ffe28a"/><rect x="85" y="12" width="11" height="40" fill="#ffe28a"/>
   </g>
   <rect x="49" y="42" width="22" height="24" rx="5" fill="#fff0a8" stroke="#a86f00" stroke-width="3"/>
   <circle cx="60" cy="52" r="4" fill="#a86f00"/>`,
  'chest-art',
);

export const SMALL_CHEST = svg(
  '0 0 120 110',
  `<rect x="12" y="50" width="96" height="52" rx="8" fill="#b9722c" stroke="#7c4a18" stroke-width="5"/>
   <path d="M12 52V38Q12 12 40 12H80Q108 12 108 38V52Z" fill="#d68f3f" stroke="#7c4a18" stroke-width="5"/>
   <rect x="24" y="12" width="11" height="90" fill="#ffc93c"/><rect x="85" y="12" width="11" height="90" fill="#ffc93c"/>
   <rect x="48" y="40" width="24" height="26" rx="5" fill="#ffc93c" stroke="#7c4a18" stroke-width="4"/>`,
);

export const EGG = svg(
  '0 0 100 120',
  `<path d="M50 6C78 6 92 50 92 72C92 98 74 114 50 114C26 114 8 98 8 72C8 50 22 6 50 6Z" fill="#fff4dc" stroke="#d9b779" stroke-width="3"/>
   <circle cx="34" cy="44" r="10" fill="#7fe0b4"/><circle cx="66" cy="34" r="7" fill="#ffc06b"/>
   <circle cx="68" cy="72" r="12" fill="#b6a2ff"/><circle cx="32" cy="88" r="9" fill="#ff9db0"/>
   <path class="crack crack-1" d="M34 64L44 56L52 66L62 58" fill="none" stroke="#7a5a2c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
   <path class="crack crack-2" d="M20 66L34 64M62 58L82 66" fill="none" stroke="#7a5a2c" stroke-width="3.5" stroke-linecap="round"/>
   <path class="crack crack-3" d="M44 56L40 42L48 30M52 66L56 82L48 94" fill="none" stroke="#7a5a2c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  'egg-art',
);

const dragon = (color: string): string =>
  svg(
    '0 0 120 120',
    `<path d="M80 92Q112 96 108 64Q104 76 86 76Z" fill="${color}"/>
     <path d="M104 62L114 54L110 70Z" fill="#ffc93c"/>
     <path d="M78 58Q106 30 104 62Q92 56 82 74Z" fill="#ffc93c" opacity=".9"/>
     <ellipse cx="60" cy="82" rx="30" ry="30" fill="${color}"/>
     <ellipse cx="56" cy="88" rx="18" ry="21" fill="#fff4dc"/>
     <path d="M30 22L38 6L46 22ZM60 18L72 4L76 22Z" fill="#ffc93c"/>
     <circle cx="50" cy="42" r="31" fill="${color}"/>
     <ellipse cx="42" cy="54" rx="21" ry="14" fill="#fff4dc"/>
     <circle cx="33" cy="51" r="2.5" fill="#2b2140"/><circle cx="46" cy="51" r="2.5" fill="#2b2140"/>
     <circle cx="36" cy="34" r="9" fill="#fff"/><circle cx="62" cy="34" r="9" fill="#fff"/>
     <circle cx="37" cy="35" r="5" fill="#2b2140"/><circle cx="61" cy="35" r="5" fill="#2b2140"/>
     <circle cx="39" cy="33" r="1.8" fill="#fff"/><circle cx="63" cy="33" r="1.8" fill="#fff"/>
     <path d="M28 60Q40 70 54 60" fill="none" stroke="#2b2140" stroke-width="3" stroke-linecap="round"/>
     <ellipse cx="42" cy="110" rx="11" ry="7" fill="${color}"/><ellipse cx="76" cy="110" rx="11" ry="7" fill="${color}"/>`,
    'dragon-art',
  );

const DRAWN: Record<string, (value: string) => string> = {
  gem,
  crown,
  dragon,
  coin: () => COIN,
  kite: () => KITE,
  pearl: () => PEARL,
  mole: () => MOLE,
  worm: () => WORM,
};

export function miniGrid(cols: number, rows: number): string {
  return `<span class="mini-grid" style="--c:${cols}" aria-hidden="true">${'<i></i>'.repeat(cols * rows)}</span>`;
}

/** The HTML for a catalog item's art. */
export function artHtml(art: string): string {
  const [name = '', value = ''] = art.split(':');
  const draw = DRAWN[name];
  return draw ? draw(value) : `<span class="emoji">${art}</span>`;
}

export function itemArt(id: string): string {
  return artHtml(itemById(id)?.art ?? '❓');
}

// ---------- The dinosaur skeletons ---------- //

const bone = (d: string, width: number, dashes = ''): string =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${
    dashes ? ` stroke-dasharray="${dashes}"` : ''
  }/>`;

const ribs = (xs: number[], top: number, length: number): string =>
  xs.map((x) => bone(`M${x} ${top}q8 ${length * 0.5} -3 ${length}`, 5)).join('');

const leg = (x: number, top: number, ground = 164): string =>
  bone(`M${x} ${top}L${x - 6} ${(top + ground) / 2}L${x + 2} ${ground}l-13 0`, 7);

type Skeleton = Record<Piece, string>;

const SKELETONS: Record<DinoId, Skeleton> = {
  longneck: {
    skull: `<ellipse cx="42" cy="30" rx="20" ry="12" fill="currentColor"/><circle cx="38" cy="27" r="4" fill="#3a3358"/>${bone('M24 38h26', 4)}`,
    neck: bone('M60 38C84 44 96 66 122 86', 9, '7 4'),
    ribs: bone('M122 86C150 68 190 70 214 92', 9) + ribs([136, 150, 164, 178, 192, 204], 80, 42),
    tail: bone('M216 94C244 112 266 134 294 142', 7, '7 4'),
    arms: leg(140, 108) + leg(154, 110),
    legs: leg(200, 110) + leg(214, 110),
  },
  threehorn: {
    skull: `<path d="M104 100Q126 62 100 36Q74 26 64 58Z" fill="currentColor"/>
      <path d="M28 94Q32 76 58 64L104 72L102 102L54 106Q38 106 28 94Z" fill="currentColor"/>
      <circle cx="66" cy="80" r="6" fill="#3a3358"/><circle cx="92" cy="56" r="6" fill="#3a3358"/>
      ${bone('M64 66L36 44', 8)}${bone('M78 58L60 28', 8)}${bone('M42 78L30 60', 7)}`,
    neck: bone('M108 88L136 88', 10, '7 4'),
    ribs: bone('M136 86C160 62 208 62 236 92', 9) + ribs([150, 164, 178, 192, 206, 220], 74, 46),
    tail: bone('M238 94C256 108 272 128 292 142', 7, '7 4'),
    arms: leg(152, 118) + leg(166, 120),
    legs: leg(214, 116) + leg(228, 116),
  },
  bigtooth: {
    skull: `<path d="M34 34Q40 16 72 18Q104 20 106 48Q106 62 90 66L36 66Q24 54 34 34Z" fill="currentColor"/>
      <circle cx="82" cy="36" r="6" fill="#3a3358"/>
      <path d="M40 58L46 68L52 58L58 68L64 58L70 68L76 58L82 66L88 58" fill="#3a3358"/>`,
    neck: bone('M104 62C118 64 128 70 140 80', 10, '7 4'),
    ribs: bone('M140 80C164 72 196 78 216 96', 9) + ribs([150, 162, 174, 186, 198], 80, 36),
    tail: bone('M218 98C244 112 268 114 296 96', 7, '7 4'),
    arms: bone('M150 110l-14 8l-9 -3M136 118l-7 6', 5),
    legs: bone('M188 112L168 136L186 164l-18 0', 9) + bone('M206 112L190 136L206 164l-16 0', 9),
  },
};

/** A skeleton as SVG: bones owned look like bones, the rest are shadows, and `fresh` ones glow. */
export function skeleton(dino: DinoId, owned: (piece: Piece) => boolean, fresh: Piece[] = []): string {
  const parts = (Object.entries(SKELETONS[dino]) as [Piece, string][]).map(([piece, drawing]) => {
    const state = owned(piece) ? 'have' : 'miss';
    return `<g class="bone-piece ${state}${fresh.includes(piece) ? ' fresh' : ''}" data-piece="${piece}">${drawing}</g>`;
  });
  return svg('0 0 300 176', parts.join(''), 'skeleton');
}
