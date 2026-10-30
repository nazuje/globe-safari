import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../animals.ts';
import { flipCard, newGame, endPeek } from '../game.ts';
import clips from './sl.clips.json';
import { MOST_SPOKEN_FLIPS, SL_ANIMALS, sl, spokenLines } from './sl.ts';

const byEnglishName = (name: string) => ANIMALS.find((animal) => animal.name === name)!;

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('never repeats a line', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('declares every animal the game can draw, in every line about it', () => {
    const lines = spokenLines();
    for (const animal of ANIMALS) {
      expect(lines).toContain(sl.animalName(animal));
      expect(lines).toContain(sl.matchLine(animal, false));
      expect(lines).toContain(sl.matchLine(animal, true));
    }
  });

  it('declares every line about the players', () => {
    const lines = spokenLines();
    for (const name of sl.playerNames) {
      expect(lines).toContain(name);
      expect(lines).toContain(sl.turnLine(name));
      expect(lines).toContain(sl.mostFound(name));
    }
  });

  it('declares every way a game can end, however long it took', () => {
    const lines = spokenLines();
    for (let flips = 12; flips <= MOST_SPOKEN_FLIPS + 40; flips += 2) {
      expect(lines).toContain(sl.soloSpoken(flips, true));
      expect(lines).toContain(sl.soloSpoken(flips, false));
    }
  });

  it('only finishes on an even number of flips, which is why only those are recorded', () => {
    let value = 7;
    const random = () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
    let game = newGame(6, 1, ANIMALS, random);
    for (let guard = 0; game.phase !== 'finished' && guard < 10000; guard++) {
      const hidden = game.cards.map((_, index) => index).filter((index) => !game.matched.includes(index));
      game = endPeek(flipCard(game, hidden[Math.floor(random() * hidden.length)]).game);
    }
    expect(game.phase).toBe('finished');
    expect(game.flips % 2).toBe(0);
  });

  it('agrees with each animal in gender', () => {
    expect(Object.keys(SL_ANIMALS)).toHaveLength(ANIMALS.length);
    expect(sl.matchLine(byEnglishName('Lion'), false)).toBe('Dva leva!');
    expect(sl.matchLine(byEnglishName('Turtle'), false)).toBe('Dve želvi!');
    expect(sl.matchLine(byEnglishName('Elephant'), false)).toBe('Dva slona!');
    expect(sl.matchLine(byEnglishName('Hippo'), true)).toBe('Dva povodna konja! Spet si na vrsti!');
  });

  it('counts flips with the right word', () => {
    expect(sl.flipCount(1)).toBe('1 obrat');
    expect(sl.flipCount(2)).toBe('2 obrata');
    expect(sl.flipCount(3)).toBe('3 obrati');
    expect(sl.flipCount(5)).toBe('5 obratov');
    expect(sl.soloSpoken(24, true)).toBe('Bravo! Imaš vse pare! Štiriindvajset obratov. Nov rekord!');
    expect(sl.soloSpoken(100, false)).toBe('Bravo! Imaš vse pare! Sto obratov.');
    expect(sl.soloSpoken(102, false)).toBe('Bravo! Imaš vse pare!');
  });

  it('never uses a gendered past form about a player', () => {
    expect(spokenLines().filter((line) => /(našel|našla|zmagal|zmagala|priden|pridna)/i.test(line))).toEqual([]);
  });
});
