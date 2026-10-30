import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import type { FlyerId } from '../flyers.ts';
import { buildFlyer } from './flyers3d.ts';

const SIZE = 260;

/** Render targets hold linear light, and a picture needs screen colours. */
const toScreen = Array.from({ length: 256 }, (_, value) => {
  const light = value / 255;
  return Math.round(255 * (light <= 0.0031308 ? 12.92 * light : 1.055 * light ** (1 / 2.4) - 0.055));
});

function toCanvasImage(pixels: Uint8Array): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const paint = canvas.getContext('2d');
  if (!paint) return null;
  const image = paint.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const from = (SIZE - 1 - y) * SIZE * 4 + x * 4;
      const to = y * SIZE * 4 + x * 4;
      const alpha = pixels[from + 3] ?? 0;
      const open = alpha === 0 ? 0 : 255 / alpha;
      for (let channel = 0; channel < 3; channel += 1) {
        image.data[to + channel] = toScreen[Math.min(Math.round((pixels[from + channel] ?? 0) * open), 255)] ?? 0;
      }
      image.data[to + 3] = alpha;
    }
  }
  paint.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

/** A big picture of a flyer for the picker, drawn by the same code that flies it, so they always match. */
export function flyerPicture(renderer: WebGLRenderer, id: FlyerId): string | null {
  const scene = new Scene();
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, -5);
  scene.add(new HemisphereLight(0xffffff, 0xc0c8e0, 1.8), new AmbientLight(0xffffff, 0.35), key);
  const model = buildFlyer(id);
  model.animate(1.1, 0.4);
  scene.add(model.group);
  const camera = new PerspectiveCamera(28, 1, 0.1, 50);
  const far = id === 'balloon' ? 11 : 10.5;
  camera.position.set(far * 0.62, far * 0.3, -far * 0.75);
  camera.lookAt(0, id === 'balloon' ? -0.1 : 0.15, 0);
  const target = new WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
  renderer.setRenderTarget(null);
  renderer.setClearColor(0x000000, 1);
  target.dispose();
  return toCanvasImage(pixels);
}
