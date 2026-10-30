import type { GlobeInstance } from 'globe.gl';
import { prettyCountryName, type CountryFeature } from '../geo/countries.ts';

const BORDER_COLOR = 'rgba(255, 255, 255, 0.28)';
const HOVER_FILL = 'rgba(255, 214, 102, 0.28)';
const CLEAR = 'rgba(0, 0, 0, 0)';

function canHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Draws faint country borders, with a gentle highlight under the mouse. */
export function showBorders(globe: GlobeInstance, countries: readonly CountryFeature[]): void {
  let hovered: object | null = null;
  const capColor = (d: object) => (d === hovered ? HOVER_FILL : CLEAR);
  const altitude = (d: object) => (d === hovered ? 0.012 : 0.006);

  globe
    .polygonsData([...countries])
    .polygonCapColor(capColor)
    .polygonSideColor(() => CLEAR)
    .polygonStrokeColor(() => BORDER_COLOR)
    .polygonAltitude(altitude)
    .polygonsTransitionDuration(200);

  if (!canHover()) return;
  globe
    .polygonLabel((d: object) => {
      const label = document.createElement('div');
      label.className = 'country-label';
      label.textContent = prettyCountryName((d as CountryFeature).properties.name);
      return label;
    })
    .onPolygonHover((polygon) => {
      hovered = polygon;
      globe.polygonCapColor(capColor).polygonAltitude(altitude);
    });
}
