import { activeSpots, FRIENDS, LEVELS, sceneById, SCENES } from './scenes.ts';
import type { LevelId, Scene, Spot } from './scenes.ts';

export type Player = 'kid' | 'grownup';

export type Phase = 'pickFriend' | 'pickScene' | 'eyes' | 'hide' | 'pass' | 'seek' | 'found' | 'end';

const PHASES: readonly Phase[] = ['pickFriend', 'pickScene', 'eyes', 'hide', 'pass', 'seek', 'found', 'end'];

/** Even, so both players seek equally often and always finish with the same stars. */
export const ROUNDS = 4;
/** After this many empty spots the right one wiggles and the others fade. */
export const WIGGLE_AFTER = 3;

export interface GameState {
  phase: Phase;
  friendId: string;
  sceneId: string;
  level: LevelId;
  round: number;
  hider: Player;
  hidingSpot: string | null;
  /** Empty spots the seeker has opened, oldest first. */
  opened: string[];
  stars: Record<Player, number>;
}

export type Action =
  | { type: 'pickFriend'; friendId: string }
  | { type: 'pickScene'; sceneId: string }
  | { type: 'setLevel'; level: LevelId }
  | { type: 'eyesShut' }
  | { type: 'hideAt'; spotId: string }
  | { type: 'ready' }
  | { type: 'startSeeking' }
  | { type: 'open'; spotId: string }
  | { type: 'next' }
  | { type: 'playAgain' };

export function newGame(previous?: Pick<GameState, 'friendId' | 'sceneId' | 'level'>): GameState {
  return {
    phase: 'pickFriend',
    friendId: previous?.friendId ?? FRIENDS[0].id,
    sceneId: previous?.sceneId ?? SCENES[0].id,
    level: previous?.level ?? 'easy',
    round: 0,
    // The grown-up hides first, so the child sees the game and earns a star straight away.
    hider: 'grownup',
    hidingSpot: null,
    opened: [],
    stars: { kid: 0, grownup: 0 },
  };
}

export function otherPlayer(player: Player): Player {
  return player === 'kid' ? 'grownup' : 'kid';
}

export function seekerOf(state: GameState): Player {
  return otherPlayer(state.hider);
}

export function sceneOf(state: GameState): Scene {
  return sceneById(state.sceneId);
}

export function spotsInPlay(state: GameState): Spot[] {
  return activeSpots(sceneOf(state), state.level);
}

function isInPlay(state: GameState, spotId: string): boolean {
  return spotsInPlay(state).some((spot) => spot.id === spotId);
}

/** The spot to wiggle, once the seeker has tried enough. Null until then. */
export function wiggleSpot(state: GameState): string | null {
  return state.phase === 'seek' && state.opened.length >= WIGGLE_AFTER ? state.hidingSpot : null;
}

function openSpot(state: GameState, spotId: string): GameState {
  if (!isInPlay(state, spotId) || state.opened.includes(spotId)) return state;
  if (spotId !== state.hidingSpot) return { ...state, opened: [...state.opened, spotId] };
  const seeker = seekerOf(state);
  return { ...state, phase: 'found', stars: { ...state.stars, [seeker]: state.stars[seeker] + 1 } };
}

function nextRound(state: GameState): GameState {
  const round = state.round + 1;
  if (round >= ROUNDS) return { ...state, phase: 'end', round };
  return { ...state, phase: 'eyes', round, hider: seekerOf(state), hidingSpot: null, opened: [] };
}

/**
 * The whole game as one function. An action that makes no sense right now, such as
 * a stray tap, returns the same state object, so mashing the screen can't break a turn.
 */
export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'pickFriend':
      return state.phase === 'pickFriend' ? { ...state, friendId: action.friendId, phase: 'pickScene' } : state;
    case 'pickScene':
      return state.phase === 'pickScene' ? { ...state, sceneId: action.sceneId, phase: 'eyes' } : state;
    case 'setLevel':
      return state.phase === 'pickFriend' || state.phase === 'pickScene' ? { ...state, level: action.level } : state;
    case 'eyesShut':
      return state.phase === 'eyes' ? { ...state, phase: 'hide' } : state;
    case 'hideAt':
      if (state.phase !== 'hide' || !isInPlay(state, action.spotId) || state.hidingSpot === action.spotId) return state;
      return { ...state, hidingSpot: action.spotId };
    case 'ready':
      return state.phase === 'hide' && state.hidingSpot ? { ...state, phase: 'pass' } : state;
    case 'startSeeking':
      return state.phase === 'pass' ? { ...state, phase: 'seek' } : state;
    case 'open':
      return state.phase === 'seek' ? openSpot(state, action.spotId) : state;
    case 'next':
      return state.phase === 'found' ? nextRound(state) : state;
    case 'playAgain':
      return state.phase === 'end' ? newGame(state) : state;
  }
}

function isPlayerCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= ROUNDS;
}

function isSavedGame(saved: Partial<GameState>): saved is GameState {
  const { phase, friendId, sceneId, level, round, hider, hidingSpot, opened, stars } = saved;
  return (
    PHASES.includes(phase as Phase) &&
    FRIENDS.some((friend) => friend.id === friendId) &&
    SCENES.some((scene) => scene.id === sceneId) &&
    LEVELS.some((item) => item.id === level) &&
    isPlayerCount(round) &&
    (hider === 'kid' || hider === 'grownup') &&
    (hidingSpot === null || typeof hidingSpot === 'string') &&
    Array.isArray(opened) &&
    isPlayerCount(stars?.kid) &&
    isPlayerCount(stars?.grownup)
  );
}

function isPlayable(state: GameState): boolean {
  const known = [...state.opened, ...(state.hidingSpot ? [state.hidingSpot] : [])];
  if (!known.every((spotId) => isInPlay(state, spotId))) return false;
  return state.hidingSpot !== null || !['pass', 'seek', 'found'].includes(state.phase);
}

/** A game saved on this device, or a fresh one if the saved value is missing or doesn't fit. */
export function restoreGame(saved: unknown): GameState {
  if (typeof saved !== 'object' || saved === null) return newGame();
  return isSavedGame(saved) && isPlayable(saved) ? saved : newGame();
}
