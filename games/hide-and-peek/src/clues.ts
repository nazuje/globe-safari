import { WIGGLE_AFTER } from './game.ts';
import { en } from './lang/en.ts';
import type { Neighbor, Text } from './lang/en.ts';
import type { Landmark, Scene, Spot, Surprise } from './scenes.ts';

export interface Clue {
  /** "near the window": a place you could point at. */
  phrase: string;
  /** Ids of what the clue talks about, so the screen can point at it for a child with the sound off. */
  anchors: string[];
  /** Every spot in play this same phrase also fits. Always includes the hiding spot. */
  matches: string[];
}

/** True when a spot really is where the landmark's word says. */
export function fitsLandmark(landmark: Landmark, spot: Spot): boolean {
  const sideways = Math.abs(landmark.col - spot.col);
  if (landmark.word === 'under') return sideways === 0 && spot.row <= 1;
  return sideways + spot.row <= 1;
}

function isNextTo(a: Spot, b: Spot): boolean {
  return a.row === b.row && Math.abs(a.col - b.col) === 1;
}

function isUnder(a: Spot, b: Spot): boolean {
  return a.col === b.col && a.row === b.row + 1;
}

function isAbove(a: Spot, b: Spot): boolean {
  return isUnder(b, a);
}

function idsWhere(spots: readonly Spot[], fits: (spot: Spot) => boolean): string[] {
  return spots.filter(fits).map((spot) => spot.id);
}

function landmarkClues(scene: Scene, spots: readonly Spot[], hidden: Spot, words: Text): Clue[] {
  return scene.landmarks
    .filter((landmark) => fitsLandmark(landmark, hidden))
    .map((landmark) => ({
      phrase: words.landmarkClue(landmark),
      anchors: [landmark.id],
      matches: idsWhere(spots, (spot) => fitsLandmark(landmark, spot)),
    }));
}

const NEIGHBORS: readonly { neighbor: Neighbor; fits: (a: Spot, b: Spot) => boolean }[] = [
  { neighbor: 'nextTo', fits: isNextTo },
  { neighbor: 'under', fits: isUnder },
  { neighbor: 'above', fits: isAbove },
];

function neighborClues(spots: readonly Spot[], hidden: Spot, words: Text): Clue[] {
  return NEIGHBORS.flatMap(({ neighbor, fits }) =>
    spots
      .filter((other) => fits(hidden, other))
      .map((other) => ({
        phrase: words.neighborClue(neighbor, other.id),
        anchors: [other.id],
        matches: idsWhere(spots, (spot) => fits(spot, other)),
      })),
  );
}

function rowClue(spots: readonly Spot[], hidden: Spot, words: Text): Clue {
  const matches = idsWhere(spots, (spot) => spot.row === hidden.row);
  return { phrase: words.rows[hidden.row], anchors: matches, matches };
}

/** Every true thing the room's layout lets us say about where a spot is. */
export function cluesFor(scene: Scene, spots: readonly Spot[], hidden: Spot, words: Text = en): Clue[] {
  return [
    ...landmarkClues(scene, spots, hidden, words),
    ...neighborClues(spots, hidden, words),
    rowClue(spots, hidden, words),
  ];
}

function stillClosed(clue: Clue, opened: readonly string[]): number {
  return clue.matches.filter((id) => !opened.includes(id)).length;
}

/**
 * The clue after the seeker has opened these empty spots, oldest first. It never
 * points back at the spot just opened or repeats itself if it can avoid it, and it
 * narrows as tries go up: broad first, then the sharpest clue the room offers.
 */
export function pickClue(
  scene: Scene,
  spots: readonly Spot[],
  hidden: Spot,
  opened: readonly string[],
  words: Text = en,
): Clue {
  const all = cluesFor(scene, spots, hidden, words);
  const last = opened.at(-1);
  const fresh = all.filter((clue) => !last || !clue.matches.includes(last));
  const pool = fresh.length > 0 ? fresh : all;
  const previous = opened.length > 1 ? pickClue(scene, spots, hidden, opened.slice(0, -1), words).phrase : null;
  const unrepeated = pool.filter((clue) => clue.phrase !== previous);
  const choices = (unrepeated.length > 0 ? unrepeated : pool).toSorted(
    (a, b) => stillClosed(a, opened) - stillClosed(b, opened),
  );
  if (opened.length >= WIGGLE_AFTER) return choices[0];
  if (opened.length === 2) return choices[Math.floor(choices.length / 2)];
  return choices[choices.length - 1];
}

function distance(a: Spot, b: Spot): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/** True when the latest spot opened is closer to the hiding spot than the one before it. */
export function isWarmer(spots: readonly Spot[], hidden: Spot, opened: readonly string[]): boolean {
  const before = spots.find((spot) => spot.id === opened.at(-2));
  const latest = spots.find((spot) => spot.id === opened.at(-1));
  if (!before || !latest) return false;
  return distance(latest, hidden) < distance(before, hidden);
}

/** What the game says after an empty spot opens, in two parts: a joke or "Warmer!", then where to look. */
export function seekParts(
  scene: Scene,
  spots: readonly Spot[],
  hidden: Spot,
  opened: readonly string[],
  surprise: Surprise,
  words: Text = en,
): [opener: string, where: string] {
  const opener = isWarmer(spots, hidden, opened) ? words.warmer : surprise.line;
  if (opened.length > WIGGLE_AFTER) return [opener, words.seeWiggle];
  return [opener, words.look(pickClue(scene, spots, hidden, opened, words).phrase)];
}

/** The same thing as one line. */
export function seekLine(
  scene: Scene,
  spots: readonly Spot[],
  hidden: Spot,
  opened: readonly string[],
  surprise: Surprise,
  words: Text = en,
): string {
  return seekParts(scene, spots, hidden, opened, surprise, words).join(' ');
}
