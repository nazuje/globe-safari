import { buildLevel } from './build.ts';
import type { Level } from './level.ts';
import type { Piece } from './pieces.ts';
import { run as ground } from './pieces.ts';
import { DIFFICULTIES, type DifficultyId } from './tuning.ts';
import type { WorldId } from './worlds.ts';

/** A small level for a test: the pieces, with plenty of flat ground after them. */
export function testLevel(pieces: Piece[], difficulty: DifficultyId = 'fast', world: WorldId = 'meadow'): Level {
  return buildLevel(
    { id: 'test', world, treasure: 'x', castle: false, pieces: [...pieces, ground(1200)] },
    DIFFICULTIES[difficulty],
  );
}
