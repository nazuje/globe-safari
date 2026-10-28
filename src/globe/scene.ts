import Globe, { type GlobeInstance } from 'globe.gl';
import { Mesh, MeshPhongMaterial, SphereGeometry, SRGBColorSpace, TextureLoader } from 'three';

const TEXTURES = `${import.meta.env.BASE_URL}textures/`;

/** Clouds float just above the ground, and drift slowly on their own. */
const CLOUD_ALTITUDE = 0.004;
const CLOUD_DRIFT_DEG_PER_SECOND = -0.4;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function addClouds(globe: GlobeInstance, reducedMotion: boolean): void {
  new TextureLoader().load(`${TEXTURES}clouds.webp`, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    const clouds = new Mesh(
      new SphereGeometry(globe.getGlobeRadius() * (1 + CLOUD_ALTITUDE), 75, 75),
      new MeshPhongMaterial({ map: texture, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    globe.scene().add(clouds);
    if (reducedMotion) return;

    let last = performance.now();
    const drift = (now: number) => {
      clouds.rotation.y += (((now - last) / 1000) * CLOUD_DRIFT_DEG_PER_SECOND * Math.PI) / 180;
      last = now;
      requestAnimationFrame(drift);
    };
    requestAnimationFrame(drift);
  });
}

function fitToWindow(globe: GlobeInstance): void {
  globe.width(window.innerWidth).height(window.innerHeight);
}

/** Builds the realistic Earth: Blue Marble, bumpy mountains, stars, glow and clouds. */
export function createEarth(container: HTMLElement, onReady: () => void): GlobeInstance {
  const reducedMotion = prefersReducedMotion();
  const globe = new Globe(container, { animateIn: !reducedMotion, waitForGlobeReady: true })
    .globeImageUrl(`${TEXTURES}earth-blue-marble.jpg`)
    .bumpImageUrl(`${TEXTURES}earth-topology.png`)
    .backgroundImageUrl(`${TEXTURES}night-sky.png`)
    .showAtmosphere(true)
    .atmosphereColor('#8fd3ff')
    .atmosphereAltitude(0.2)
    .onGlobeReady(onReady);

  globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));
  fitToWindow(globe);
  window.addEventListener('resize', () => fitToWindow(globe));
  addClouds(globe, reducedMotion);
  return globe;
}
