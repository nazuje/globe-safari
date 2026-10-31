import { CanvasTexture, Color, MeshBasicMaterial, MeshLambertMaterial, AdditiveBlending, DoubleSide, type Texture } from 'three';
import type { Color as BeamColor } from '../rules/board.ts';

/** The workshop: a dark walnut bench, a steel-blue tray, brass fittings, and the light does the rest. */
export const PALETTE = {
  night: 0x0a0816,
  bench: 0x2a1a14,
  benchDark: 0x20130f,
  tileA: 0x20284d,
  tileB: 0x262f59,
  rim: 0xb9782a,
  brass: 0xe8a33c,
  copper: 0xb5532c,
  steel: 0x5a6688,
  steelDark: 0x363f5e,
  chrome: 0xe9f6ff,
  crate: 0xf0b429,
  ink: 0x151127,
};

export const BEAM_COLORS: Record<BeamColor, number> = {
  white: 0xfff0c2,
  red: 0xff3b6b,
  green: 0x37f7a0,
  blue: 0x45b1ff,
};

export const LINK_COLORS = [0xff9a2e, 0x35e0d0];
export const PORTAL_COLORS = [0xb56bff, 0xff7a3d];

export const flat = (color: number, emissive = 0): MeshLambertMaterial =>
  new MeshLambertMaterial({ color, flatShading: true, emissive, side: DoubleSide });

export const additive = (map: Texture, color = 0xffffff, opacity = 1): MeshBasicMaterial =>
  new MeshBasicMaterial({ map, color, opacity, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

function canvasTexture(size: number, paint: (context: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) paint(context, size);
  return new CanvasTexture(canvas);
}

/** Soft across its width, for the glow around a beam. */
export const stripTexture = (): CanvasTexture =>
  canvasTexture(64, (context, size) => {
    const fade = context.createLinearGradient(0, 0, 0, size);
    fade.addColorStop(0, 'rgba(255,255,255,0)');
    fade.addColorStop(0.5, 'rgba(255,255,255,1)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = fade;
    context.fillRect(0, 0, size, size);
  });

export const haloTexture = (): CanvasTexture =>
  canvasTexture(64, (context, size) => {
    const fade = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    fade.addColorStop(0, 'rgba(255,255,255,1)');
    fade.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = fade;
    context.fillRect(0, 0, size, size);
  });

/** A four-pointed twinkle, for the bounce. */
export const sparkTexture = (): CanvasTexture =>
  canvasTexture(64, (context, size) => {
    const middle = size / 2;
    const fade = context.createRadialGradient(middle, middle, 0, middle, middle, middle * 0.45);
    fade.addColorStop(0, 'rgba(255,255,255,1)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = fade;
    context.fillRect(0, 0, size, size);
    context.fillStyle = '#fff';
    for (const flip of [0, 1]) {
      context.save();
      context.translate(middle, middle);
      context.rotate((flip * Math.PI) / 2);
      context.beginPath();
      context.moveTo(-middle, 0);
      context.quadraticCurveTo(0, 3, middle, 0);
      context.quadraticCurveTo(0, -3, -middle, 0);
      context.fill();
      context.restore();
    }
  });

export const beamColor = (name: BeamColor): Color => new Color(BEAM_COLORS[name]);
