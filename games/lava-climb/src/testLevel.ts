import { buildLevel, type DropSpec, type Level, type MoveSpec } from './level.ts';

interface Options {
  lavaSpeed?: number;
  walls?: boolean;
  dash?: boolean;
  moves?: MoveSpec[];
  drops?: DropSpec[];
}

/** A tiny tower from a map, for trying one rule at a time. The hero starts on the bottom row, 4 tiles in. */
export function testLevel(map: string[], options: Options = {}): Level {
  return buildLevel({
    id: 'test',
    map,
    lavaSpeed: options.lavaSpeed ?? 0,
    lavaDelay: 0,
    par: 30,
    walls: options.walls ?? false,
    dash: options.dash ?? false,
    fish: false,
    moves: options.moves ?? [],
    drops: options.drops ?? [],
  });
}
