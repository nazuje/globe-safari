import type { CountryFeature } from '../geo/countries.ts';
import { showBorders } from './borders.ts';
import { createCamera } from './camera.ts';
import { setMarker } from './marker.ts';
import { createEarth, prefersReducedMotion } from './scene.ts';

export interface GlobeViewOptions {
  /** Called when the family taps any spot on the Earth, land or sea. */
  onPick: (lat: number, lng: number) => void;
  /** Called once the Earth's textures have loaded. */
  onReady: () => void;
}

/** Everything the rest of the app needs from the 3D globe. */
export function createGlobeView(container: HTMLElement, { onPick, onReady }: GlobeViewOptions) {
  const globe = createEarth(container, onReady);
  const camera = createCamera(globe, { reducedMotion: prefersReducedMotion() });

  globe
    .onGlobeClick(({ lat, lng }) => onPick(lat, lng))
    .onPolygonClick((_polygon, _event, { lat, lng }) => onPick(lat, lng));

  return {
    showBorders: (countries: readonly CountryFeature[]) => showBorders(globe, countries),
    /** Flies to a spot and drops a pin there. */
    visit(lat: number, lng: number) {
      setMarker(globe, { lat, lng });
      camera.flyTo(lat, lng);
    },
    /** Pulls the pin up and zooms back out to space. */
    goHome() {
      setMarker(globe, null);
      camera.flyHome();
    },
    setOffset: camera.setOffset,
  };
}

export type GlobeView = ReturnType<typeof createGlobeView>;
