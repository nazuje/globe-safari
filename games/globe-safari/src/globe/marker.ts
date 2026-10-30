import type { GlobeInstance } from 'globe.gl';

interface MarkerPoint {
  lat: number;
  lng: number;
}

/**
 * The globe positions the outer element itself (it owns its CSS transform), so
 * the bounce lives on an inner pin whose tip sits exactly on the spot.
 */
function markerElement(): HTMLElement {
  const anchor = document.createElement('div');
  anchor.className = 'marker';
  anchor.setAttribute('aria-hidden', 'true');
  const pin = document.createElement('span');
  pin.className = 'marker-pin';
  pin.textContent = '📍';
  anchor.append(pin);
  return anchor;
}

/** Places (or clears) the little pin that marks the spot the family tapped. */
export function setMarker(globe: GlobeInstance, point: MarkerPoint | null): void {
  globe
    .htmlElementsData(point ? [{ ...point }] : [])
    .htmlAltitude(0.01)
    .htmlTransitionDuration(0)
    .htmlElement(markerElement);
}
