import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { cluesFor, pickClue, seekLine, seekParts } from '../clues.ts';
import { activeSpots, LEVELS, sceneById, SCENES, spotById, surpriseFor } from '../scenes.ts';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

const bedroom = sceneById('bedroom');
const hardRoom = activeSpots(bedroom, 'hard');

function everyRun() {
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

function phrases(spotId: string, scene = bedroom, spots = hardRoom): string[] {
  return cluesFor(scene, spots, spotById(scene, spotId), sl).map((clue) => clue.phrase);
}

it('has a clip for every Slovenian line', () => {
  expect(missingClips(clips, spokenLines())).toEqual([]);
});

describe('every clue in every possible game', () => {
  it('points at the same place as the English one, so it is just as true', () => {
    for (const { scene, spots, hidden, opened } of everyRun()) {
      const clue = pickClue(scene, spots, hidden, opened, sl);
      expect(clue.matches).toContain(hidden.id);
      expect(clue.anchors).toEqual(pickClue(scene, spots, hidden, opened, en).anchors);
    }
  });

  it('is spoken in at most seven words, from lines that have been recorded', () => {
    const declared = new Set(spokenLines());
    for (const { scene, spots, hidden, opened } of everyRun()) {
      const surprise = surpriseFor(scene, opened[opened.length - 1], 0, sl);
      const line = seekLine(scene, spots, hidden, opened, surprise, sl);
      expect(line.split(' ').length, line).toBeLessThanOrEqual(7);
      for (const part of seekParts(scene, spots, hidden, opened, surprise, sl)) expect(declared).toContain(part);
    }
  });
});

describe('position words take the right case', () => {
  it('uses the locative after pri', () => {
    expect(phrases('curtain')).toContain('pri oknu');
    expect(phrases('wardrobe')).toContain('pri vratih');
    expect(phrases('doghouse', sceneById('farm'), activeSpots(sceneById('farm'), 'hard'))).toContain('pri hlevu');
  });

  it('uses the accusative after pod and nad, because the line sends you there', () => {
    expect(phrases('box')).toContain('pod posteljo');
    expect(phrases('tent')).toContain('nad košaro');
    expect(phrases('plant')).toContain('pod uro');
    expect(sl.neighborClue('under', 'pot')).toBe('pod lonec');
    const garden = sceneById('garden');
    expect(phrases('shed', garden, activeSpots(garden, 'hard'))).toContain('pod zmaja');
  });

  it('uses the genitive after zraven', () => {
    expect(phrases('tent')).toEqual(expect.arrayContaining(['zraven postelje', 'zraven skrinje']));
  });

  it('declines the two-word hiding place', () => {
    expect(sl.neighborClue('nextTo', 'doghouse')).toBe('zraven pasje hišice');
    expect(sl.neighborClue('under', 'doghouse')).toBe('pod pasjo hišico');
  });

  it('tells where the friend really was, with the instrumental for a location', () => {
    expect(sl.found('bunny', 'curtain')).toBe('Kuku! Zajček je za zaveso!');
    expect(sl.found('fox', 'wardrobe')).toBe('Kuku! Lisička je v omari!');
    expect(sl.found('panda', 'table')).toBe('Kuku! Panda je na mizi!');
    expect(sl.found('bear', 'pillow')).toBe('Kuku! Medvedek je pod blazino!');
  });
});

it('puts the friend in the accusative when you hide it', () => {
  expect(sl.hideFriend('bunny')).toMatch(/^Skrij zajčka!/);
  expect(sl.hideFriend('panda')).toMatch(/^Skrij pando!/);
});

it('never tells the child what gender they are', () => {
  const gendered = /\b(našel|našla|priden|pridna|pripravljen|pripravljena|skril|skrila|našli)\b/iu;
  expect(spokenLines().filter((line) => gendered.test(line))).toEqual([]);
});
