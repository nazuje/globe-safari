import { describe, expect, it } from 'vitest';
import { newGame, reduce, restoreGame, ROUNDS, spotsInPlay, WIGGLE_AFTER, wiggleSpot } from './game.ts';
import type { Action, GameState } from './game.ts';

function play(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(reduce, state);
}

function atSeek(spotId = 'bed'): GameState {
  return play(
    newGame(),
    { type: 'pickFriend', friendId: 'fox' },
    { type: 'pickScene', sceneId: 'bedroom' },
    { type: 'eyesShut' },
    { type: 'hideAt', spotId },
    { type: 'ready' },
    { type: 'startSeeking' },
  );
}

function playRound(state: GameState): GameState {
  const spotId = spotsInPlay(state)[state.round].id;
  return play(
    state,
    { type: 'eyesShut' },
    { type: 'hideAt', spotId },
    { type: 'ready' },
    { type: 'startSeeking' },
    { type: 'open', spotId },
    { type: 'next' },
  );
}

describe('a turn', () => {
  it('walks hider, pass, seeker, reveal', () => {
    const state = atSeek();
    expect(state.phase).toBe('seek');
    expect(state.friendId).toBe('fox');
    expect(state.hidingSpot).toBe('bed');
    expect(reduce(state, { type: 'open', spotId: 'bed' }).phase).toBe('found');
  });

  it('lets the grown-up hide first so the child seeks first', () => {
    expect(newGame().hider).toBe('grownup');
    expect(reduce(atSeek(), { type: 'open', spotId: 'bed' }).stars).toEqual({ kid: 1, grownup: 0 });
  });

  it('needs a hiding place before Ready works', () => {
    const hiding = play(
      newGame(),
      { type: 'pickFriend', friendId: 'fox' },
      { type: 'pickScene', sceneId: 'bedroom' },
      { type: 'eyesShut' },
    );
    expect(reduce(hiding, { type: 'ready' })).toBe(hiding);
  });

  it('lets the hider change their mind before Ready', () => {
    const moved = play(
      newGame(),
      { type: 'pickFriend', friendId: 'fox' },
      { type: 'pickScene', sceneId: 'bedroom' },
      { type: 'eyesShut' },
      { type: 'hideAt', spotId: 'bed' },
      { type: 'hideAt', spotId: 'chest' },
    );
    expect(moved.hidingSpot).toBe('chest');
  });

  it('remembers empty spots in order without a penalty', () => {
    const state = play(atSeek(), { type: 'open', spotId: 'chest' }, { type: 'open', spotId: 'plant' });
    expect(state.opened).toEqual(['chest', 'plant']);
    expect(state.phase).toBe('seek');
    expect(state.stars).toEqual({ kid: 0, grownup: 0 });
  });

  it('swaps roles after a find', () => {
    const state = play(atSeek(), { type: 'open', spotId: 'bed' }, { type: 'next' });
    expect(state).toMatchObject({ phase: 'eyes', hider: 'kid', round: 1, hidingSpot: null, opened: [] });
  });
});

describe('stray taps', () => {
  it('ignores opening a spot twice, or one not in play', () => {
    const state = reduce(atSeek(), { type: 'open', spotId: 'chest' });
    expect(reduce(state, { type: 'open', spotId: 'chest' })).toBe(state);
    expect(reduce(state, { type: 'open', spotId: 'tent' })).toBe(state);
  });

  it('cannot hide in a spot that level leaves out', () => {
    const hiding = play(
      newGame(),
      { type: 'pickFriend', friendId: 'fox' },
      { type: 'pickScene', sceneId: 'bedroom' },
      { type: 'eyesShut' },
    );
    expect(reduce(hiding, { type: 'hideAt', spotId: 'tent' })).toBe(hiding);
  });

  it('ignores every action that does not belong to the phase', () => {
    const found = reduce(atSeek(), { type: 'open', spotId: 'bed' });
    const strays: Action[] = [
      { type: 'pickFriend', friendId: 'bear' },
      { type: 'pickScene', sceneId: 'farm' },
      { type: 'setLevel', level: 'hard' },
      { type: 'eyesShut' },
      { type: 'hideAt', spotId: 'chest' },
      { type: 'ready' },
      { type: 'startSeeking' },
      { type: 'open', spotId: 'chest' },
      { type: 'playAgain' },
    ];
    for (const stray of strays) expect(reduce(found, stray)).toBe(found);
  });

  it('gives only one star however hard the found spot is mashed', () => {
    const state = play(atSeek(), { type: 'open', spotId: 'bed' }, { type: 'open', spotId: 'bed' });
    expect(state.stars.kid).toBe(1);
  });
});

describe('never stuck', () => {
  it('wiggles the right spot after a few tries', () => {
    const tries = ['chest', 'plant', 'curtain'].slice(0, WIGGLE_AFTER).map((spotId): Action => ({ type: 'open', spotId }));
    const almost = play(atSeek(), ...tries.slice(0, -1));
    expect(wiggleSpot(almost)).toBeNull();
    expect(wiggleSpot(play(almost, tries[tries.length - 1]))).toBe('bed');
  });

  it('can reach the hiding spot even after every other spot is opened', () => {
    const state = atSeek('pillow');
    const others = spotsInPlay(state).filter((spot) => spot.id !== 'pillow');
    const opened = play(state, ...others.map((spot): Action => ({ type: 'open', spotId: spot.id })));
    expect(opened.opened).toHaveLength(others.length);
    expect(reduce(opened, { type: 'open', spotId: 'pillow' }).phase).toBe('found');
  });
});

describe('a whole game', () => {
  it('ends with the same stars for both players and no loser', () => {
    let state = reduce(reduce(newGame(), { type: 'pickFriend', friendId: 'fox' }), {
      type: 'pickScene',
      sceneId: 'farm',
    });
    for (let round = 0; round < ROUNDS; round++) state = playRound(state);
    expect(state.phase).toBe('end');
    expect(state.stars.kid).toBe(state.stars.grownup);
    expect(state.stars.kid).toBe(ROUNDS / 2);
  });

  it('plays again with the same friend, scene and level, and clean stars', () => {
    const ended: GameState = { ...atSeek(), phase: 'end', stars: { kid: 2, grownup: 2 }, level: 'hard' };
    const again = reduce(ended, { type: 'playAgain' });
    expect(again).toMatchObject({ phase: 'pickFriend', friendId: 'fox', sceneId: 'bedroom', level: 'hard', round: 0 });
    expect(again.stars).toEqual({ kid: 0, grownup: 0 });
  });
});

describe('restoreGame', () => {
  it('brings back a game in progress', () => {
    const state = reduce(atSeek(), { type: 'open', spotId: 'chest' });
    expect(restoreGame(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it.each([
    ['nothing', null],
    ['a wrong type', 'hello'],
    ['an unknown phase', { ...atSeek(), phase: 'nap' }],
    ['an unknown scene', { ...atSeek(), sceneId: 'moon' }],
    ['a hiding spot not in play', { ...atSeek(), hidingSpot: 'tent' }],
    ['a seek with nobody hidden', { ...atSeek(), hidingSpot: null }],
    ['opened spots that are not a list', { ...atSeek(), opened: 'bed' }],
  ])('starts fresh from %s', (_name, saved) => {
    expect(restoreGame(saved).phase).toBe('pickFriend');
  });
});
