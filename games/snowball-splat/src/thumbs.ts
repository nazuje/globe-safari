import {
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import type { HatId } from './hats.ts';
import { hatShape, toyMaterial } from './models.ts';

const SIZE = 128;

const pictures = new Map<HatId, string>();

/** Turns a linear colour value into what a screen expects. */
function forScreen(value: number): number {
  const linear = value / 255;
  const encoded = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

function toDataUrl(pixels: Uint8Array): string {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const pen = canvas.getContext('2d');
  if (!pen) return '';
  const image = pen.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const from = ((SIZE - 1 - y) * SIZE + x) * 4;
      const to = (y * SIZE + x) * 4;
      image.data[to] = forScreen(pixels[from]);
      image.data[to + 1] = forScreen(pixels[from + 1]);
      image.data[to + 2] = forScreen(pixels[from + 2]);
      image.data[to + 3] = pixels[from + 3];
    }
  }
  pen.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/** A little picture of a hat, drawn once from its real 3D model. */
export function hatPicture(renderer: WebGLRenderer, hat: HatId): string {
  const saved = pictures.get(hat);
  if (saved) return saved;
  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0xaabbdd, 2.4), new Mesh(hatShape(hat), toyMaterial));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(-2, 4, 5);
  scene.add(sun);
  const camera = new PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 1.35, 3.05);
  camera.lookAt(0, 0.42, 0);
  const target = new WebGLRenderTarget(SIZE, SIZE);
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  const clearAlpha = renderer.getClearAlpha();
  renderer.setClearAlpha(0);
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
  renderer.setRenderTarget(null);
  renderer.setClearAlpha(clearAlpha);
  target.dispose();
  const url = toDataUrl(pixels);
  pictures.set(hat, url);
  return url;
}
