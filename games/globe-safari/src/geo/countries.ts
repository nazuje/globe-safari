import { geoBounds, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';

export interface CountryProps {
  name: string;
}

export type CountryFeature = Feature<Geometry, CountryProps>;

/** Answers "which country is this point in?" — null means open water. */
export type CountryLookup = (lat: number, lng: number) => string | null;

interface IndexedCountry {
  feature: CountryFeature;
  south: number;
  north: number;
  west: number;
  east: number;
}

/** Natural Earth abbreviates some names; spell them out for young readers. */
const FULL_NAMES: Record<string, string> = {
  'Dem. Rep. Congo': 'Democratic Republic of the Congo',
  'Central African Rep.': 'Central African Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan',
  'W. Sahara': 'Western Sahara',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Dominican Rep.': 'Dominican Republic',
  'Solomon Is.': 'Solomon Islands',
  'Falkland Is.': 'Falkland Islands',
  'Fr. S. Antarctic Lands': 'French Southern Lands',
  'Fr. Polynesia': 'French Polynesia',
  'N. Mariana Is.': 'Northern Mariana Islands',
  'Marshall Is.': 'Marshall Islands',
  'Cayman Is.': 'Cayman Islands',
  'Turks and Caicos Is.': 'Turks and Caicos Islands',
  'U.S. Virgin Is.': 'U.S. Virgin Islands',
  'British Virgin Is.': 'British Virgin Islands',
  'Faeroe Is.': 'Faroe Islands',
  'Cook Is.': 'Cook Islands',
  'Heard I. and McDonald Is.': 'Heard and McDonald Islands',
  'S. Geo. and the Is.': 'South Georgia',
  'N. Cyprus': 'Northern Cyprus',
  'St. Vin. and Gren.': 'Saint Vincent and the Grenadines',
  'St. Kitts and Nevis': 'Saint Kitts and Nevis',
  'St. Pierre and Miquelon': 'Saint Pierre and Miquelon',
  'Antigua and Barb.': 'Antigua and Barbuda',
  'São Tomé and Principe': 'São Tomé and Príncipe',
  'Wallis and Futuna Is.': 'Wallis and Futuna',
  'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
  'Indian Ocean Ter.': 'Australian Indian Ocean Territories',
  'Ashmore and Cartier Is.': 'Ashmore and Cartier Islands',
  'Siachen Glacier': 'Siachen Glacier',
  'United States of America': 'United States',
};

export function prettyCountryName(name: string): string {
  return FULL_NAMES[name] ?? name;
}

/** Turns the world-atlas TopoJSON into one GeoJSON feature per country. */
export function countryFeatures(topology: Topology): CountryFeature[] {
  const collection = topology.objects.countries as GeometryCollection<CountryProps>;
  return feature(topology, collection).features as CountryFeature[];
}

function indexCountry(country: CountryFeature): IndexedCountry {
  const [[west, south], [east, north]] = geoBounds(country);
  return { feature: country, south, north, west, east };
}

function boundsMayContain(c: IndexedCountry, lat: number, lng: number): boolean {
  if (lat < c.south || lat > c.north) return false;
  if (c.west <= c.east) return lng >= c.west && lng <= c.east;
  return lng >= c.west || lng <= c.east; // the country crosses the 180° meridian
}

/** Builds a fast point-in-country lookup from country features. */
export function createCountryLookup(features: readonly CountryFeature[]): CountryLookup {
  const indexed = features.map(indexCountry);
  return (lat, lng) => {
    const hit = indexed.find(
      (c) => boundsMayContain(c, lat, lng) && geoContains(c.feature, [lng, lat]),
    );
    return hit ? prettyCountryName(hit.feature.properties.name) : null;
  };
}
