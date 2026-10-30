import { describe, expect, it } from 'vitest';
import { cluesFor, fitsLandmark, isWarmer, pickClue, seekLine } from './clues.ts';
import { WIGGLE_AFTER } from './game.ts';
import { activeSpots, LEVELS, sceneById, SCENES, spotById, surpriseFor } from './scenes.ts';
import type { Scene, Spot } from './scenes.ts';

const bedroom = sceneById('bedroom');
const hardRoom = activeSpots(bedroom, 'hard');

/** Every game a seeker could play: each scene, level and hiding spot, opening the others in a few orders. */
function everyRun(): { scene: Scene; spots: Spot[]; hidden: Spot; opened: string[] }[] {
  return SCENES.flatMap((scene) =>
    LEVELS.flatMap((level) => {
      const spots = activeSpots(scene, level.id);
      return spots.flatMap((hidden) => {
        const others = spots.filter((spot) => spot !== hidden).map((spot) => spot.id);
        return [others, others.toReversed(), others.toSorted()].flatMap((order) =>
          order.map((_, count) => ({ scene, spots, hidden, opened: order.slice(0, count + 1) })),
        );
      });
    }),
  );
}

function phrases(spotId: string): string[] {
  return cluesFor(bedroom, hardRoom, spotById(bedroom, spotId)).map((clue) => clue.phrase);
}

describe('clues come from the real room', () => {
  it('says near the window for the curtain below it', () => {
    expect(phrases('curtain')).toContain('near the window');
  });

  it('says by the door for the wardrobe beside it', () => {
    expect(phrases('wardrobe')).toContain('by the door');
  });

  it('says under the bed for the box below it', () => {
    expect(phrases('box')).toContain('under the bed');
  });

  it('says next to and above from who stands around a spot', () => {
    expect(phrases('tent')).toEqual(expect.arrayContaining(['next to the bed', 'next to the chest', 'above the basket']));
  });

  it('only "under" a landmark means straight below it', () => {
    const clock = bedroom.landmarks[1];
    expect(fitsLandmark(clock, spotById(bedroom, 'plant'))).toBe(true);
    expect(fitsLandmark(clock, spotById(bedroom, 'curtain'))).toBe(false);
  });

  it('never mentions a spot the level leaves out', () => {
    const easy = activeSpots(bedroom, 'easy');
    const text = cluesFor(bedroom, easy, spotById(bedroom, 'basket'))
      .map((clue) => clue.phrase)
      .join(' ');
    expect(text).not.toMatch(/tent|box/);
  });
});

describe('every clue in every possible game', () => {
  it('has something to say about every spot', () => {
    for (const { scene, spots, hidden } of everyRun()) {
      expect(cluesFor(scene, spots, hidden).length).toBeGreaterThan(0);
    }
  });

  it('is true: it fits the hiding spot', () => {
    for (const { scene, spots, hidden, opened } of everyRun()) {
      expect(pickClue(scene, spots, hidden, opened).matches).toContain(hidden.id);
    }
  });

  it('points at things that are really in the room', () => {
    for (const { scene, spots, hidden, opened } of everyRun()) {
      const known = [...spots, ...scene.landmarks].map((thing) => thing.id);
      expect(known).toEqual(expect.arrayContaining(pickClue(scene, spots, hidden, opened).anchors));
    }
  });

  it('is spoken in at most seven words', () => {
    for (const { scene, spots, hidden, opened } of everyRun()) {
      const surprise = surpriseFor(scene, opened[opened.length - 1], 0);
      const line = seekLine(scene, spots, hidden, opened, surprise);
      expect(line.split(' ').length, line).toBeLessThanOrEqual(7);
    }
  });
});

describe('picking a clue', () => {
  const hidden = spotById(bedroom, 'bed');

  it('does not send you back to the spot you just opened when it can help it', () => {
    expect(pickClue(bedroom, hardRoom, hidden, ['box']).matches).not.toContain('box');
  });

  it('starts broad and sharpens up by the time the spot wiggles', () => {
    const closed = (opened: string[]) =>
      pickClue(bedroom, hardRoom, hidden, opened).matches.filter((id) => !opened.includes(id)).length;
    const first = closed(['pillow']);
    const late = closed(['pillow', 'plant', 'chest'].slice(0, WIGGLE_AFTER));
    expect(late).toBeLessThan(first);
  });

  it('does not repeat itself twice running if it has another choice', () => {
    const one = pickClue(bedroom, hardRoom, hidden, ['pillow']).phrase;
    const two = pickClue(bedroom, hardRoom, hidden, ['pillow', 'basket']).phrase;
    expect(two).not.toBe(one);
  });
});

describe('warmer', () => {
  const hidden = spotById(bedroom, 'curtain');

  it('is said when the latest try is closer', () => {
    expect(isWarmer(hardRoom, hidden, ['pillow', 'plant'])).toBe(true);
  });

  it('stays quiet going further away, on the first try, and at the same distance', () => {
    expect(isWarmer(hardRoom, hidden, ['plant', 'pillow'])).toBe(false);
    expect(isWarmer(hardRoom, hidden, ['plant'])).toBe(false);
    expect(isWarmer(hardRoom, hidden, ['plant', 'bed'])).toBe(false);
  });
});

describe('seekLine', () => {
  const hidden = spotById(bedroom, 'curtain');
  const surprise = { emoji: '🐭', line: 'Not me!' };

  it('opens with the joke, then the clue', () => {
    expect(seekLine(bedroom, hardRoom, hidden, ['pillow'], surprise)).toMatch(/^Not me! Look .+!$/);
  });

  it('opens with Warmer when you are', () => {
    expect(seekLine(bedroom, hardRoom, hidden, ['pillow', 'plant'], surprise)).toMatch(/^Warmer! Look /);
  });

  it('points at the wiggle once words have had their chance', () => {
    const opened = ['pillow', 'basket', 'box', 'tent'];
    expect(seekLine(bedroom, hardRoom, hidden, opened, surprise)).toBe('Not me! See it wiggle?');
  });
});
