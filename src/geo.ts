import { Country, State, City } from 'country-state-city';

export interface GeoResult {
  key: string;
  label: string;
  type: 'country' | 'state' | 'city';
}

function normalizeQuery(q: string): string {
  return q.toLowerCase().trim();
}

export function searchGeo(q: string, limit = 10): GeoResult[] {
  if (!q || q.trim().length === 0) return [];

  const nq = normalizeQuery(q);
  const results: GeoResult[] = [];

  // Search countries
  const countries = Country.getAllCountries();
  for (const country of countries) {
    if (results.length >= limit) break;
    if (country.name.toLowerCase().includes(nq) || country.isoCode.toLowerCase().includes(nq)) {
      results.push({
        key: country.isoCode,
        label: country.name,
        type: 'country',
      });
    }
  }

  if (results.length >= limit) return results.slice(0, limit);

  // Search states/provinces
  const allStates = State.getAllStates();
  for (const state of allStates) {
    if (results.length >= limit) break;
    if (
      state.name.toLowerCase().includes(nq) ||
      state.isoCode.toLowerCase().includes(nq)
    ) {
      const countryObj = Country.getCountryByCode(state.countryCode);
      const countryName = countryObj?.name ?? state.countryCode;
      results.push({
        key: `${state.countryCode}-${state.isoCode}`,
        label: `${state.name}, ${countryName}`,
        type: 'state',
      });
    }
  }

  if (results.length >= limit) return results.slice(0, limit);

  // Search cities
  const allCities = City.getAllCities();
  for (const city of allCities) {
    if (results.length >= limit) break;
    if (city.name.toLowerCase().includes(nq)) {
      const stateObj = State.getStateByCodeAndCountry(city.stateCode, city.countryCode);
      const countryObj = Country.getCountryByCode(city.countryCode);
      const stateName = stateObj?.name ?? city.stateCode;
      const countryName = countryObj?.name ?? city.countryCode;
      results.push({
        key: `${city.countryCode}-${city.stateCode}-${city.name}`,
        label: `${city.name}, ${stateName}, ${countryName}`,
        type: 'city',
      });
    }
  }

  return results.slice(0, limit);
}
