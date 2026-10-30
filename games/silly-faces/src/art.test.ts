import { describe, expect, it } from 'vitest';
import { BUILDS, creatureInner, creatureSvg, optionPicture } from './art.ts';
import { COLORS, FIRST_LOOK, HATS, HELD, OPTIONS, PARTS, RARE_COLORS, SHAPES, type Look, type Part } from './parts.ts';

const HEAD_ROOM = 146;

describe('drawing a creature', () => {
  it('draws every shape with every hat, held thing and color', () => {
    for (const shape of SHAPES) {
      for (const hat of HATS) {
        for (const held of HELD) {
          for (const color of [...COLORS, ...RARE_COLORS]) {
            const art = creatureInner({ ...FIRST_LOOK, shape, hat, held, color });
            expect(art).not.toContain('undefined');
            expect(art).not.toContain('NaN');
          }
        }
      }
    }
  });

  it('has a gradient wherever a color needs one', () => {
    for (const color of RARE_COLORS) expect(creatureInner({ ...FIRST_LOOK, color })).toContain(`id="sf-${color}"`);
    expect(creatureInner({ ...FIRST_LOOK, color: 'teal' })).not.toContain('<defs>');
  });

  it('keeps the face on the body and leaves room for the tallest hat in every shape', () => {
    for (const build of Object.values(BUILDS)) {
      expect(build.top).toBeLessThan(build.eyeY);
      expect(build.eyeY).toBeLessThan(build.mouthY);
      expect(build.hatY).toBeGreaterThan(build.top);
      expect(build.hatY - HEAD_ROOM).toBeGreaterThanOrEqual(-60);
    }
  });

  it('starts idle loops at the given moment', () => {
    expect(creatureSvg(FIRST_LOOK, 2)).toContain('--phase:-2s');
  });
});

describe('option pictures', () => {
  it('has a picture for every option of every part', () => {
    const everyPart = (part: Part): void => {
      for (const id of OPTIONS[part]) {
        const look: Look = FIRST_LOOK;
        const picture = optionPicture(part, id as never, look);
        expect(picture.length, `${part} ${String(id)}`).toBeGreaterThan(0);
        expect(picture).not.toContain('undefined');
      }
    };
    PARTS.forEach(everyPart);
  });
});
