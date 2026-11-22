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

export async function getHolidays(countryCode, year) {
  const res = await fetch(`${BASE}/PublicHolidays/${year}/${countryCode}`);
  if (!res.ok) throw new Error("Could not load holidays");
  return toHolidays(await res.json(), countryCode);
}

// Upcoming holidays starting from today
export async function getNextHolidays(countryCode) {
  const res = await fetch(`${BASE}/NextPublicHolidays/${countryCode}`);
  if (!res.ok) throw new Error("Could not load upcoming holidays");
  return toHolidays(await res.json(), countryCode);
}
