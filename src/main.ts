import './style.css';
import { REGIONS } from './data/regions.ts';
import type { Region } from './data/types.ts';
import { loadBorderShapes, loadCountryLookup } from './geo/loadCountries.ts';
import { lookupRegion } from './geo/lookup.ts';
import { createGlobeView } from './globe/view.ts';
import { createPanel } from './ui/panel.ts';
import { createStarCounter } from './ui/stars.ts';

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

const hint = byId('hint');
const loading = byId('loading');
const stars = createStarCounter(byId('stars'), byId('star-count'));
const countryLookup = loadCountryLookup();
let currentRegion: Region | null = null;

const view = createGlobeView(byId('globe'), {
  onPick: (lat, lng) => void visit(lat, lng),
  onReady: () => loading.classList.add('is-done'),
});

const panel = createPanel(byId('panel'), {
  onStar: () => stars.add(),
  onClose: () => goHome(),
  onLayout: ({ right, bottom }) => view.setOffset(-right / 2, -bottom / 2),
});

function hideHint() {
  hint.classList.add('is-hidden');
}

function showLoadError() {
  hint.textContent = 'Oops! The map could not load. Check your internet and try again.';
  hint.classList.remove('is-hidden');
}

async function visit(lat: number, lng: number) {
  hideHint();
  view.visit(lat, lng);
  try {
    const result = lookupRegion(lat, lng, await countryLookup);
    currentRegion = result.region;
    panel.open(result);
  } catch {
    showLoadError();
  }
}

function goHome() {
  currentRegion = null;
  panel.close();
  view.goHome();
}

function surprise() {
  const choices = REGIONS.filter((region) => region !== currentRegion);
  const region = choices[Math.floor(Math.random() * choices.length)];
  void visit(region.anchor.lat, region.anchor.lng);
}

countryLookup.catch(showLoadError);
byId('surprise').addEventListener('click', surprise);
byId('home').addEventListener('click', goHome);

loadBorderShapes()
  .then((countries) => view.showBorders(countries))
  .catch(() => {
    // Borders are a nice extra; the game still works without them.
  });
