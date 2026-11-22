import { customHolidaysInYear } from "./customHolidays";

// Nager.Date API (free, no key): https://date.nager.at
const BASE = "https://date.nager.at/api/v3";

// Keep only nationwide holidays, and keep the country on every holiday object.
function toHolidays(list, countryCode) {
  return list
    .filter((h) => h.global)
    .map((h) => ({ date: h.date, name: h.name, country: countryCode }));
}

export async function getCountries() {
  const res = await fetch(`${BASE}/AvailableCountries`);
  if (!res.ok) throw new Error("Could not load countries");
  const list = await res.json();
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

// The public holidays of a country in a year: the ones from the API, plus the ones the
// user added by hand (marked with custom: true). A holiday from the API wins when both
// are on the same date.
export async function getHolidays(countryCode, year) {
  const res = await fetch(`${BASE}/PublicHolidays/${year}/${countryCode}`);
  if (!res.ok) throw new Error("Could not load holidays");
  const fromApi = toHolidays(await res.json(), countryCode);

  const known = new Set(fromApi.map((h) => h.date));
  const own = customHolidaysInYear(countryCode, year)
    .filter((h) => !known.has(h.date))
    .map((h) => ({ date: h.date, name: h.name, country: countryCode, custom: true }));

  return [...fromApi, ...own];
}

// Upcoming holidays starting from today
export async function getNextHolidays(countryCode) {
  const res = await fetch(`${BASE}/NextPublicHolidays/${countryCode}`);
  if (!res.ok) throw new Error("Could not load upcoming holidays");
  return toHolidays(await res.json(), countryCode);
}
