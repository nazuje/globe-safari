export type RideId =
  | 'car'
  | 'unicorn'
  | 'tractor'
  | 'rocket'
  | 'dragon'
  | 'bicycle'
  | 'fireEngine'
  | 'carpet'
  | 'snail'
  | 'dinosaur'
  | 'scooter'
  | 'turtle'
  | 'helicopter'
  | 'train'
  | 'robot'
  | 'skateboard'
  | 'saucer'
  | 'rainbow';

/** How a ride moves on the road: rolling jiggles, hopping bounces, hovering floats. */
export type Gait = 'roll' | 'hop' | 'hover';

export interface Ride {
  id: RideId;
  /** An emoji, or the name of a piece of art drawn in sprites.ts. */
  art: string;
  /** Total stars that unlock it. Zero means it's open from the first go. */
  stars: number;
  gait: Gait;
  /** Quarter turns clockwise that point the art up the road. */
  turn: number;
  /** What puffs out behind it. */
  trail: string;
  /** The little note its lane change plays. */
  pitch: number;
}

/** Listed in the order the garage shows them, open rides first and cheapest locked ride next. */
export const RIDES: readonly Ride[] = [
  { id: 'car', art: '🏎️', stars: 0, gait: 'roll', turn: 0, trail: '💨', pitch: 330 },
  { id: 'unicorn', art: '🦄', stars: 0, gait: 'hop', turn: 0, trail: '✨', pitch: 660 },
  { id: 'tractor', art: '🚜', stars: 0, gait: 'roll', turn: 0, trail: '💨', pitch: 165 },
  { id: 'rocket', art: '🚀', stars: 0, gait: 'hover', turn: -0.5, trail: '🔥', pitch: 880 },
  { id: 'dragon', art: '🐉', stars: 0, gait: 'hop', turn: 0, trail: '🔥', pitch: 220 },
  { id: 'bicycle', art: '🚲', stars: 0, gait: 'roll', turn: 0, trail: '💨', pitch: 523 },
  { id: 'fireEngine', art: '🚒', stars: 0, gait: 'roll', turn: 0, trail: '💧', pitch: 440 },
  { id: 'carpet', art: 'carpet', stars: 0, gait: 'hover', turn: 0, trail: '✨', pitch: 587 },
  { id: 'snail', art: '🐌', stars: 15, gait: 'hop', turn: 0, trail: '💧', pitch: 262 },
  { id: 'dinosaur', art: '🦖', stars: 40, gait: 'hop', turn: 0, trail: '💨', pitch: 147 },
  { id: 'scooter', art: '🛵', stars: 70, gait: 'roll', turn: 0, trail: '💨', pitch: 392 },
  { id: 'turtle', art: '🐢', stars: 110, gait: 'hop', turn: 0, trail: '💧', pitch: 196 },
  { id: 'helicopter', art: '🚁', stars: 150, gait: 'hover', turn: 0, trail: '💨', pitch: 494 },
  { id: 'train', art: '🚂', stars: 200, gait: 'roll', turn: 0, trail: '💨', pitch: 294 },
  { id: 'robot', art: '🤖', stars: 260, gait: 'hop', turn: 0, trail: '✨', pitch: 740 },
  { id: 'skateboard', art: '🛹', stars: 330, gait: 'roll', turn: 0, trail: '✨', pitch: 622 },
  { id: 'saucer', art: '🛸', stars: 420, gait: 'hover', turn: 0, trail: '✨', pitch: 988 },
  { id: 'rainbow', art: '🌈', stars: 520, gait: 'hover', turn: 0, trail: '✨', pitch: 1047 },
];

export function rideById(id: string): Ride | undefined {
  return RIDES.find((ride) => ride.id === id);
}
