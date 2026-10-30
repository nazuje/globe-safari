import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { BEST_PIXEL_RATIO, fovForAspect, nextPixelRatio, stepSeconds } from './quality.ts';

const FRAMES_TO_JUDGE = 90;

export type FrameListener = (seconds: number) => void;

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  canvas: HTMLCanvasElement;
  /** Runs every frame, with a time step that's safe after the tab has slept. */
  onFrame(listener: FrameListener): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

export interface StageOptions {
  fov?: number;
  near?: number;
  far?: number;
}

/** False on the rare device with no 3D, so a game can say so kindly instead of showing a blank page. */
export function canUse3d(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

/** A full-size 3D scene in `host`, or null when this device can't draw one. */
export function createStage(host: HTMLElement, { fov = 55, near = 0.1, far = 400 }: StageOptions = {}): Stage | null {
  if (!canUse3d()) return null;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true });
  } catch {
    return null;
  }
  const canvas = renderer.domElement;
  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, near, far);
  const listeners = new Set<FrameListener>();
  let running = false;
  let lastAt = 0;
  let frames = 0;
  let framesStartedAt = 0;
  let pixelRatio = Math.min(window.devicePixelRatio, BEST_PIXEL_RATIO);

  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  host.append(canvas);

  function fit(): void {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = fovForAspect(fov, camera.aspect);
    camera.updateProjectionMatrix();
  }

  function judgeSpeed(now: number): void {
    frames += 1;
    if (frames < FRAMES_TO_JUDGE) return;
    const next = nextPixelRatio(pixelRatio, (now - framesStartedAt) / frames);
    frames = 0;
    framesStartedAt = now;
    if (next === pixelRatio) return;
    pixelRatio = next;
    fit();
  }

  function frame(now: number): void {
    const seconds = stepSeconds(now - lastAt);
    lastAt = now;
    judgeSpeed(now);
    for (const listener of listeners) listener(seconds);
    renderer.render(scene, camera);
  }

  function resume(): void {
    lastAt = performance.now();
    frames = 0;
    framesStartedAt = lastAt;
    renderer.setAnimationLoop(frame);
  }

  function visibilityChanged(): void {
    if (!running) return;
    if (document.hidden) renderer.setAnimationLoop(null);
    else resume();
  }

  // Without this, a lost context never comes back. Three rebuilds everything once it does.
  function contextLost(event: Event): void {
    event.preventDefault();
  }

  const observer = new ResizeObserver(fit);
  observer.observe(host);
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibilityChanged);
  fit();

  return {
    scene,
    camera,
    renderer,
    canvas,
    onFrame: (listener) => void listeners.add(listener),
    start() {
      if (running) return;
      running = true;
      if (!document.hidden) resume();
    },
    stop() {
      running = false;
      renderer.setAnimationLoop(null);
    },
    dispose() {
      running = false;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', visibilityChanged);
      renderer.dispose();
      canvas.remove();
    },
  };
}
