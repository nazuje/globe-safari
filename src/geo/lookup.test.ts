import { describe, expect, it } from 'vitest';
import type { Topology } from 'topojson-specification';
import countriesRaw from 'world-atlas/countries-50m.json?raw';
import { REGIONS } from '../data/regions.ts';
import { countryFeatures, createCountryLookup } from './countries.ts';
import { lookupRegion } from './lookup.ts';

const countryAt = createCountryLookup(countryFeatures(JSON.parse(countriesRaw) as Topology));
const lookup = (lat: number, lng: number) => lookupRegion(lat, lng, countryAt);

describe('lookupRegion with real places', () => {
  it.each([
    ['Manaus', -3.12, -60.02, 'amazon'],
    ['Nairobi', -1.29, 36.82, 'african-savanna'],
    ['the Serengeti', -2.33, 34.83, 'african-savanna'],
    ['Antananarivo', -18.88, 47.51, 'madagascar'],
    ['Kathmandu', 27.72, 85.32, 'himalayas'],
    ['Mount Everest', 27.99, 86.93, 'himalayas'],
    ['Sydney', -33.87, 151.21, 'australian-east-coast'],
    ['Cairns', -16.92, 145.77, 'australian-east-coast'],
    ['the reef off Cairns', -16.5, 146.5, 'great-barrier-reef'],
    ['Uluru', -25.34, 131.04, 'australian-outback'],
    ['the middle of the Pacific', 0, -150, 'pacific-ocean'],
    ['the middle of the Atlantic', 30, -40, 'atlantic-ocean'],
    ['the middle of the Indian Ocean', -20, 80, 'indian-ocean'],
    ['the South Pole area', -80, 0, 'antarctica'],
    ['the sea off Antarctica', -65, -100, 'southern-ocean'],
    ['the Galápagos', -0.6, -90.5, 'galapagos'],
    ['Christchurch', -43.53, 172.64, 'new-zealand'],
    ['the Sahara', 23, 10, 'sahara'],
    ['Oslo', 59.91, 10.75, 'nordic-taiga'],
    ['Stockholm', 59.4, 17.8, 'nordic-taiga'],
    ['Beijing', 39.9, 116.4, 'china-bamboo'],
    ['Chengdu', 30.67, 104.07, 'china-bamboo'],
    ['Denver', 39.74, -104.99, 'rocky-mountains'],
    ['Kansas', 38.5, -98.5, 'great-plains'],
    ['Phoenix', 33.45, -112.07, 'desert-southwest'],
    ['Maine', 45.2, -69.2, 'north-american-forests'],
    ['Costa Rica', 10, -84, 'caribbean'],
    ['the Caribbean Sea', 15, -75, 'caribbean'],
    ['Cusco', -13.53, -71.97, 'andes'],
    ['southern Patagonia', -48, -70, 'patagonia'],
    ['the Congo', -1, 22, 'congo-rainforest'],
    ['Riyadh', 24.71, 46.68, 'arabian-desert'],
    ['Paris', 48.86, 2.35, 'european-woodlands'],
    ['Lake Baikal shore', 52.3, 104.3, 'siberia'],
    ['Greenland', 72, -40, 'arctic'],
    ['Delhi', 28.61, 77.21, 'india-jungles'],
    ['Borneo', 1, 114, 'southeast-asia'],
  ])('%s', (_place, lat, lng, regionId) => {
    expect(lookup(lat, lng).region.id).toBe(regionId);
  });

  it('puts the North Pole in the Arctic', () => {
    expect(lookup(90, 0).region.name).toMatch(/Arctic/);
    expect(lookup(89.9, 45).region.name).toMatch(/Arctic/);
  });

  it('reports the country on land and none at sea', () => {
    expect(lookup(-3.12, -60.02)).toMatchObject({ country: 'Brazil', onLand: true });
    expect(lookup(-1.29, 36.82).country).toBe('Kenya');
    expect(lookup(-1, 22).country).toBe('Democratic Republic of the Congo');
    expect(lookup(0, -150)).toMatchObject({ country: null, onLand: false });
  });

  it('gives a faraway ocean island the surrounding ocean', () => {
    const hawaii = lookup(19.6, -155.5);
    expect(hawaii.onLand).toBe(true);
    expect(hawaii.region.id).toBe('pacific-ocean');
  });

  it('keeps the Pacific and Caribbean coasts of Central America apart', () => {
    expect(lookup(10, -86.5).region.id).toBe('pacific-ocean');
    expect(lookup(12, -82).region.id).toBe('caribbean');
    expect(lookup(25, -90).region.id).toBe('atlantic-ocean'); // Gulf of Mexico
    expect(lookup(15, -97).region.id).toBe('pacific-ocean');
  });
});

describe('lookupRegion everywhere', () => {
  it('resolves every point on a 5° grid to a known region', () => {
    const ids = new Set(REGIONS.map((r) => r.id));
    for (let lat = -90; lat <= 90; lat += 5) {
      for (let lng = -180; lng < 180; lng += 5) {
        const { region } = lookup(lat, lng);
        expect(ids.has(region.id), `${lat}, ${lng}`).toBe(true);
      }
    }
  });

  it('sends each region’s own anchor point back to that region', () => {
    for (const region of REGIONS) {
      expect(lookup(region.anchor.lat, region.anchor.lng).region.id, region.id).toBe(region.id);
    }
  });
});
