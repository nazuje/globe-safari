import { sprite } from './sprites.ts';

interface Bubble {
  x: number;
  born: number;
  life: number;
  size: number;
}

interface Ember {
  x: number;
  rise: number;
  speed: number;
  drift: number;
}

const BUBBLES = 10;
const EMBERS = 16;
const SURFACE_POINTS = 26;
const GLOW_REACH = 130;

export interface LavaArt {
  /** Draws from the surface down. `y` is the surface on screen, all in device pixels. */
  draw: (c: CanvasRenderingContext2D, y: number, time: number) => void;
}

/**
 * The look comes from layers that cost next to nothing: one wavy shape filled with a ready-made gradient, a
 * ready-made glow added on top, and a few moving dots. There are no per-pixel effects.
 */
export function makeLava(width: number, height: number, scale: number, calm: boolean, lively: () => boolean): LavaArt {
  const glowHeight = GLOW_REACH * scale;
  const glow = sprite(4, glowHeight, (c) => {
    const fade = c.createLinearGradient(0, glowHeight, 0, 0);
    fade.addColorStop(0, 'rgba(255, 120, 30, 0.62)');
    fade.addColorStop(0.35, 'rgba(255, 70, 20, 0.24)');
    fade.addColorStop(1, 'rgba(255, 40, 20, 0)');
    c.fillStyle = fade;
    c.fillRect(0, 0, 4, glowHeight);
  });
  const body = sprite(4, height, (c) => {
    const fade = c.createLinearGradient(0, 0, 0, height);
    fade.addColorStop(0, '#fff3a0');
    fade.addColorStop(0.03, '#ffc21f');
    fade.addColorStop(0.1, '#ff6a12');
    fade.addColorStop(0.32, '#e0261a');
    fade.addColorStop(1, '#6e0f1e');
    c.fillStyle = fade;
    c.fillRect(0, 0, 4, height);
  });
  const bubbles: Bubble[] = Array.from({ length: BUBBLES }, (_, at) => ({ x: ((at * 73) % 101) / 101, born: -at * 0.31, life: 0.9, size: 3 }));
  const embers: Ember[] = Array.from({ length: EMBERS }, (_, at) => ({ x: ((at * 61) % 97) / 97, rise: ((at * 37) % 83) / 83, speed: 0.18 + ((at * 13) % 7) * 0.03, drift: 2 + (at % 5) }));

  const wave = (x: number, time: number): number => {
    if (calm) return Math.sin(x * 9) * 2 * scale;
    return (Math.sin(x * 9 + time * 2.3) * 3 + Math.sin(x * 23 - time * 3.7) * 1.6 + Math.sin(x * 4 + time * 1.1) * 2.4) * scale;
  };

  function surface(c: CanvasRenderingContext2D, y: number, time: number): void {
    c.beginPath();
    c.moveTo(0, y + height);
    for (let at = 0; at <= SURFACE_POINTS; at += 1) {
      const share = at / SURFACE_POINTS;
      c.lineTo(share * width, y + wave(share * 6.28, time));
    }
    c.lineTo(width, y + height);
    c.closePath();
  }

  function drawCrust(c: CanvasRenderingContext2D, y: number, time: number): void {
    c.fillStyle = 'rgba(120, 16, 24, 0.5)';
    for (let at = 0; at < 6; at += 1) {
      const slide = calm ? 0 : Math.sin(time * 0.4 + at) * 18 * scale;
      c.beginPath();
      c.ellipse((((at * 53) % 89) / 89) * width + slide, y + (24 + at * 15) * scale, (16 + (at % 3) * 9) * scale, (2.6 + at % 2) * scale, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawBubbles(c: CanvasRenderingContext2D, y: number, time: number): void {
    for (const bubble of bubbles) {
      const age = (time - bubble.born) / bubble.life;
      if (age >= 1) {
        bubble.born = time + Math.random() * 0.4;
        bubble.x = Math.random();
        bubble.life = 0.6 + Math.random() * 0.7;
        bubble.size = 2 + Math.random() * 3;
      }
      if (age < 0) continue;
      const x = bubble.x * width;
      const radius = bubble.size * scale * (0.5 + age);
      c.globalAlpha = 1 - age * age;
      c.fillStyle = '#ffe27a';
      c.beginPath();
      c.arc(x, y + wave((x / width) * 6.28, time) - age * 4 * scale, radius, Math.PI, 0);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  function drawEmbers(c: CanvasRenderingContext2D, y: number, time: number): void {
    c.fillStyle = '#ffc24a';
    for (const ember of embers) {
      const share = (ember.rise + time * ember.speed) % 1;
      c.globalAlpha = (1 - share) * 0.9;
      const size = Math.max(1, (1.8 - share) * scale);
      c.fillRect(ember.x * width + Math.sin(time * 2 + ember.drift) * ember.drift * scale, y - share * GLOW_REACH * scale, size, size);
    }
    c.globalAlpha = 1;
  }

  return {
    draw(c, y, time) {
      const top = Math.round(y);
      c.globalCompositeOperation = 'lighter';
      c.drawImage(glow, 0, top - glowHeight, width, glowHeight);
      c.globalCompositeOperation = 'source-over';
      if (!calm && lively()) drawEmbers(c, y, time);
      c.save();
      surface(c, y, time);
      c.clip();
      c.drawImage(body, 0, top - 6 * scale, width, height);
      drawCrust(c, y, time);
      c.restore();
      surface(c, y, time);
      c.strokeStyle = '#fff6b8';
      c.lineWidth = Math.max(1.5, 1.6 * scale);
      c.stroke();
      if (!calm) drawBubbles(c, y, time);
    },
  };
}

/** A cheeky fish that pops up, waves a fin and sinks back. `age` runs from 0 to 1. */
export function drawFish(c: CanvasRenderingContext2D, x: number, surface: number, age: number, time: number): void {
  const rise = Math.sin(Math.min(1, age) * Math.PI);
  const up = Math.min(1, rise * 1.5) * 22;
  c.save();
  c.translate(x, surface - up + 12);
  c.fillStyle = '#ff9a2e';
  c.beginPath();
  c.ellipse(0, 0, 9, 13, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffe07a';
  c.beginPath();
  c.ellipse(0, 3, 5.5, 8, 0, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(8, -2);
  c.rotate(-0.7 + Math.sin(time * 14) * 0.6);
  c.fillStyle = '#ff5a2e';
  c.beginPath();
  c.ellipse(5, 0, 6, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.fillStyle = '#fff';
  for (const side of [-3.4, 3.4]) {
    c.beginPath();
    c.arc(side, -6, 2.8, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#1b1020';
  for (const side of [-3, 3.8]) {
    c.beginPath();
    c.arc(side, -6, 1.3, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#7a1a10';
  c.lineWidth = 1.3;
  c.beginPath();
  c.arc(0, -1.5, 3, 0.2, Math.PI - 0.2);
  c.stroke();
  c.restore();
}
