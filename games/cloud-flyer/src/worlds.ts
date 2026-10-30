export const WORLD_IDS = ['sunny', 'sunset', 'snow', 'night', 'candy'] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export type Decor = 'trees' | 'palms' | 'pines' | 'lollipops';

/** Everything that changes between worlds is colour and decoration, so each is one small table. */
export interface World {
  id: WorldId;
  icon: string;
  skyTop: number;
  skyMid: number;
  skyLow: number;
  fog: number;
  /** The CSS colour behind the top bar, so the bar melts into the sky. */
  bar: string;
  hemiSky: number;
  hemiGround: number;
  hemiPower: number;
  sun: number;
  sunPower: number;
  disc: number;
  discHigh: number;
  grass: number[];
  rock: number[];
  cloud: number;
  trunk: number;
  leaf: number[];
  water: number;
  walls: number[];
  roofs: number[];
  /** Colour of the bits drifting past, or null for clear air. */
  flake: number | null;
  decor: Decor;
  peaks: boolean;
  lanterns: boolean;
  windowsGlow: boolean;
}

export const WORLDS: Record<WorldId, World> = {
  sunny: {
    id: 'sunny',
    icon: '🏝️',
    skyTop: 0x2f9df0,
    skyMid: 0x8fd4ff,
    skyLow: 0xdff4ff,
    fog: 0xcdeeff,
    bar: '#3ba5f2',
    hemiSky: 0xffffff,
    hemiGround: 0xd4e6e4,
    hemiPower: 1.9,
    sun: 0xfff2d0,
    sunPower: 1.9,
    disc: 0xfff6c0,
    discHigh: 0xfffdf0,
    grass: [0x63d45f, 0x4cc26b, 0x8ee05a],
    rock: [0xc79a6b, 0xb0845c, 0xd8b184],
    cloud: 0xffffff,
    trunk: 0x8a5a3a,
    leaf: [0x2fae62, 0x46c76b, 0x7fd04f],
    water: 0x58c8ff,
    walls: [0xfff1d6, 0xffd9a8, 0xffffff],
    roofs: [0xff6b6b, 0xff9f43, 0x8b5cf6],
    flake: null,
    decor: 'trees',
    peaks: false,
    lanterns: false,
    windowsGlow: false,
  },
  sunset: {
    id: 'sunset',
    icon: '🌅',
    skyTop: 0x5a48c8,
    skyMid: 0xff7e6b,
    skyLow: 0xffd27a,
    fog: 0xffb98a,
    bar: '#6450c8',
    hemiSky: 0xffe0d0,
    hemiGround: 0xd8a0a8,
    hemiPower: 1.7,
    sun: 0xffb070,
    sunPower: 2.2,
    disc: 0xffa03c,
    discHigh: 0xffeb9a,
    grass: [0xe0a24c, 0xd98a4a, 0xf0be5a],
    rock: [0x9a5a78, 0x84506e, 0xb46e80],
    cloud: 0xffd9d0,
    trunk: 0x6e4050,
    leaf: [0xc8553d, 0xe07a3c, 0xa8486e],
    water: 0xff9e80,
    walls: [0xffe4c4, 0xffc9a0, 0xfff0d8],
    roofs: [0x8b3a6e, 0xc94444, 0x5a48c8],
    flake: null,
    decor: 'palms',
    peaks: false,
    lanterns: false,
    windowsGlow: true,
  },
  snow: {
    id: 'snow',
    icon: '🏔️',
    skyTop: 0x4c9be0,
    skyMid: 0xb5dcf5,
    skyLow: 0xeef7ff,
    fog: 0xe2f1fb,
    bar: '#509ee2',
    hemiSky: 0xffffff,
    hemiGround: 0xb0c8e0,
    hemiPower: 2,
    sun: 0xffffff,
    sunPower: 1.7,
    disc: 0xfff8e0,
    discHigh: 0xffffff,
    grass: [0xffffff, 0xeef5ff, 0xdfeeff],
    rock: [0x8fa3bf, 0x7a8fae, 0xa8b8d0],
    cloud: 0xfafdff,
    trunk: 0x6a5048,
    leaf: [0x2f8f78, 0x3aa488, 0x267a70],
    water: 0xa8e6ff,
    walls: [0xc98a5a, 0xdfa070, 0xb87a50],
    roofs: [0xffffff, 0xf0f6ff, 0xe4eeff],
    flake: 0xffffff,
    decor: 'pines',
    peaks: true,
    lanterns: false,
    windowsGlow: true,
  },
  night: {
    id: 'night',
    icon: '🏮',
    skyTop: 0x0f1250,
    skyMid: 0x27308a,
    skyLow: 0x5a4fb0,
    fog: 0x3a3a96,
    bar: '#141858',
    hemiSky: 0xa8b8ff,
    hemiGround: 0x4a3f8c,
    hemiPower: 2.1,
    sun: 0xcfd8ff,
    sunPower: 1.5,
    disc: 0xf4f0d0,
    discHigh: 0xffffff,
    grass: [0x3f8f7a, 0x35807a, 0x4fa080],
    rock: [0x5a5a9a, 0x4c4c8c, 0x6a68a8],
    cloud: 0xb8c0f0,
    trunk: 0x4a3c58,
    leaf: [0x2c7a70, 0x38907c, 0x246a6e],
    water: 0x7fb4ff,
    walls: [0xc8c8e8, 0xb0b0d8, 0xd8d0e8],
    roofs: [0x7a4fb0, 0xc0507a, 0x4a60c0],
    flake: 0xfff2b0,
    decor: 'pines',
    peaks: false,
    lanterns: true,
    windowsGlow: true,
  },
  candy: {
    id: 'candy',
    icon: '🍭',
    skyTop: 0x7fd0f5,
    skyMid: 0xffc4e4,
    skyLow: 0xfff0c8,
    fog: 0xffe0ea,
    bar: '#86d2f5',
    hemiSky: 0xffffff,
    hemiGround: 0xf0b0d0,
    hemiPower: 2,
    sun: 0xfff0f0,
    sunPower: 1.6,
    disc: 0xfff4a0,
    discHigh: 0xfffff0,
    grass: [0xff9ed2, 0xffc06e, 0x8ee8c8, 0xc8a0ff],
    rock: [0xc98a5a, 0xdda06a, 0xfff0d8],
    cloud: 0xfff0f8,
    trunk: 0xffffff,
    leaf: [0xff6b9e, 0x6ee0d0, 0xffd24c, 0xb08cff],
    water: 0xff9ecf,
    walls: [0xc98a5a, 0xffe0f0, 0xfff0c8],
    roofs: [0xffffff, 0xff6b9e, 0x6ee0d0],
    flake: 0xffffff,
    decor: 'lollipops',
    peaks: false,
    lanterns: false,
    windowsGlow: false,
  },
};
