import type { GlobeInstance } from 'globe.gl';

export const SPACE_ALTITUDE = 2.4;
const CLOSE_ALTITUDE = 1.1;
const ROTATE_SPEED = 0.35;
const RESUME_AFTER_MS = 12_000;

export interface CameraOptions {
  reducedMotion: boolean;
}

/** Smooth camera moves, the panel-aware globe offset, and idle auto-rotation. */
export function createCamera(globe: GlobeInstance, { reducedMotion }: CameraOptions) {
  const controls = globe.controls();
  const flyMs = reducedMotion ? 0 : 1600;
  let idle = true;
  let resumeTimer: number | undefined;
  let offsetAnimation = 0;

  function stopRotating() {
    controls.autoRotate = false;
    window.clearTimeout(resumeTimer);
  }

  function resumeRotatingSoon(delay = RESUME_AFTER_MS) {
    window.clearTimeout(resumeTimer);
    if (reducedMotion) return;
    resumeTimer = window.setTimeout(() => {
      if (idle) controls.autoRotate = true;
    }, delay);
  }

  controls.autoRotateSpeed = ROTATE_SPEED;
  controls.autoRotate = !reducedMotion;
  controls.minDistance = globe.getGlobeRadius() * 1.25;
  controls.maxDistance = globe.getGlobeRadius() * 6;
  controls.addEventListener('start', stopRotating);
  controls.addEventListener('end', () => {
    if (idle) resumeRotatingSoon();
  });
  globe.pointOfView({ altitude: SPACE_ALTITUDE });

  function animateOffset(target: [number, number]) {
    cancelAnimationFrame(offsetAnimation);
    const [fromX, fromY] = globe.globeOffset();
    const start = performance.now();
    const duration = reducedMotion ? 0 : 500;
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const ease = 1 - (1 - t) ** 3;
      globe.globeOffset([fromX + (target[0] - fromX) * ease, fromY + (target[1] - fromY) * ease]);
      if (t < 1) offsetAnimation = requestAnimationFrame(step);
    };
    offsetAnimation = requestAnimationFrame(step);
  }

  return {
    /** Swoops down to a spot on the globe and stops the idle spin. */
    flyTo(lat: number, lng: number) {
      idle = false;
      stopRotating();
      const altitude = Math.min(globe.pointOfView().altitude, CLOSE_ALTITUDE);
      globe.pointOfView({ lat, lng, altitude }, flyMs);
    },
    /** Zooms back out to space and lets the Earth spin again. */
    flyHome() {
      idle = true;
      globe.pointOfView({ altitude: SPACE_ALTITUDE }, flyMs);
      resumeRotatingSoon(flyMs + 400);
    },
    /** Shifts the globe so the chosen spot stays visible beside an open panel. */
    setOffset(x: number, y: number) {
      animateOffset([x, y]);
    },
  };
}

export type Camera = ReturnType<typeof createCamera>;
