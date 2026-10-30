import { burst } from '@playroom/kit';
import type { Actor } from './actor.ts';
import { creatureSvg, POINTS } from './art.ts';
import { puff, spray } from './fx.ts';
import { RARE_COLORS, type Color, type Look } from './parts.ts';
import type { Reaction } from './reactions.ts';
import { playNotes, sound } from './sounds.ts';
import { SOUNDS } from './tunes.ts';

const TINY_MS = 3000;

export interface Scene {
  actor: Actor;
  floor: HTMLElement;
  look: () => Look;
  /** Changes the creature's color for good, like a tap on a swatch. */
  recolor: (color: Color) => void;
}

/** A surprising color that isn't the one it has now. */
export function nextRareColor(current: Color): Color {
  const at = RARE_COLORS.indexOf(current as (typeof RARE_COLORS)[number]);
  return RARE_COLORS[(at + 1 + Math.floor(Math.random() * (RARE_COLORS.length - 1))) % RARE_COLORS.length]!;
}

function popOutTiny(floor: HTMLElement, look: Look): void {
  floor.querySelector('.tiny')?.remove();
  const tiny = document.createElement('div');
  tiny.className = 'tiny';
  tiny.dataset.act = 'wave';
  tiny.innerHTML = `<span class="mover">${creatureSvg(look)}</span>`;
  floor.prepend(tiny);
  setTimeout(() => tiny.remove(), TINY_MS);
}

type Script = (scene: Scene) => void;

function at(scene: Scene, spot: { x: number; y: number }): { x: number; y: number } {
  return scene.actor.screen(spot.x, spot.y);
}

const SCRIPTS: Record<Reaction, Script> = {
  burp({ actor, look }) {
    actor.act('burp', 1200);
    sound('burp');
    const mouth = actor.screen(POINTS.mouth(look()).x, POINTS.mouth(look()).y);
    spray('🫧', mouth.x, mouth.y, 4, 80);
  },

  sneeze(scene) {
    const { actor, look } = scene;
    actor.act('sneeze', 2100);
    playNotes(SOUNDS.inhale);
    actor.during(850, () => {
      sound('whoosh');
      sound('bonk');
      const mouth = at(scene, POINTS.mouth(look()));
      spray('💦', mouth.x, mouth.y, 5, 130);
    });
    actor.during(1850, () => sound('pop'));
  },

  toot(scene) {
    scene.actor.act('toot', 1500);
    sound('toot');
    const behind = at(scene, POINTS.behind());
    puff('💨', behind.x, behind.y, { dx: -40, dy: 10, size: 56, ms: 1100 });
  },

  giggle(scene) {
    scene.actor.act('giggle', 1400);
    playNotes(SOUNDS.giggle);
    const eyes = at(scene, POINTS.eyes(scene.look()));
    spray('💛', eyes.x, eyes.y, 4, 130);
  },

  yawn(scene) {
    const { actor, look } = scene;
    actor.act('yawn', 2600);
    playNotes(SOUNDS.yawn);
    const drift = (): void => {
      const top = at(scene, POINTS.top(look()));
      puff('💤', top.x + 60, top.y + 20, { dx: 50, dy: -70, ms: 1200, size: 44 });
    };
    actor.during(900, drift);
    actor.during(1600, drift);
  },

  spin({ actor }) {
    actor.act('spin', 1200);
    sound('whoosh');
    actor.during(500, () => sound('whoosh'));
    actor.during(1100, () => sound('boing'));
  },

  tiny(scene) {
    const { actor, floor, look } = scene;
    actor.act('tiny', TINY_MS);
    playNotes(SOUNDS.poof);
    popOutTiny(floor, look());
    actor.during(450, () => sound('tada'));
  },

  insideOut(scene) {
    const { actor, look, recolor } = scene;
    actor.act('insideOut', 1900);
    sound('whoosh');
    actor.during(700, () => {
      recolor(nextRareColor(look().color));
      sound('boing');
    });
    actor.during(1000, () => {
      sound('tada');
      const eyes = at(scene, POINTS.eyes(look()));
      burst(eyes.x, eyes.y, 22);
    });
  },

  float({ actor }) {
    actor.act('float', 3000);
    playNotes(SOUNDS.float);
    playNotes(SOUNDS.fall);
    actor.during(2350, () => sound('bonk'));
    actor.during(2500, () => sound('boing'));
  },
};

export function perform(reaction: Reaction, scene: Scene): void {
  SCRIPTS[reaction](scene);
}
