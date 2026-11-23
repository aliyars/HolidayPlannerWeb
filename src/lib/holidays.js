import { customHolidaysInYear } from "./customHolidays";

// Nager.Date API (free, no key): https://date.nager.at
const BASE = "https://date.nager.at/api/v3";

// Download JSON. When anything goes wrong (no internet, a server error), the error is
// always the clear message we give, not a technical one like "Failed to fetch".
async function getJson(url, message) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(message);
  }
  if (!res.ok) throw new Error(message);
  return res.json();
}

// Keep only nationwide holidays, and keep the country on every holiday object.
function toHolidays(list, countryCode) {
  return list
    .filter((h) => h.global)
    .map((h) => ({ date: h.date, name: h.name, country: countryCode }));
}

export async function getCountries() {
  const list = await getJson(`${BASE}/AvailableCountries`, "Could not load the countries");
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

// The public holidays of a country in a year: the official ones, plus the ones the user
// added by hand (marked with custom: true). A holiday from the API wins when both are on
// the same date.
// The official holidays come from OUR server (/api/holidays), which gets them from Nager.Date.
export async function getHolidays(countryCode, year) {
  const data = await getJson(`/api/holidays?country=${countryCode}&year=${year}`, "Could not load the holidays");
  const fromApi = data.holidays;

  const known = new Set(fromApi.map((h) => h.date));
  const own = customHolidaysInYear(countryCode, year)
    .filter((h) => !known.has(h.date))
    .map((h) => ({ date: h.date, name: h.name, country: countryCode, custom: true }));

  return [...fromApi, ...own];
}

// Upcoming holidays starting from today
export async function getNextHolidays(countryCode) {
  const list = await getJson(`${BASE}/NextPublicHolidays/${countryCode}`, "Could not load the upcoming holidays");
  return toHolidays(list, countryCode);
}
