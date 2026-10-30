import type { Topology } from 'topojson-specification';
import detailedUrl from 'world-atlas/countries-50m.json?url';
import simpleUrl from 'world-atlas/countries-110m.json?url';
import { countryFeatures, createCountryLookup, type CountryFeature, type CountryLookup } from './countries.ts';

async function fetchCountries(url: string): Promise<CountryFeature[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load country shapes (${response.status})`);
  return countryFeatures((await response.json()) as Topology);
}

/** Light shapes for drawing borders smoothly on any device. */
export function loadBorderShapes(): Promise<CountryFeature[]> {
  return fetchCountries(simpleUrl);
}

/** Detailed shapes, so small islands like the Galápagos count as land. */
export async function loadCountryLookup(): Promise<CountryLookup> {
  return createCountryLookup(await fetchCountries(detailedUrl));
}
