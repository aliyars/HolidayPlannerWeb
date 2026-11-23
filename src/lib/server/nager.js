// SERVER SIDE only (used by the files in app/api). It never runs in the browser.
//
// The server gets the public holidays from Nager.Date and keeps them in memory for a day,
// so the same country and year are not downloaded again and again, however many users ask.

const BASE = "https://date.nager.at/api/v3";
const ONE_DAY = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 300; // the cache never grows bigger than this

const cache = new Map(); // "2026-KR" -> { time, holidays }

// "KR", "id" ... two letters
export function isValidCountry(code) {
  return typeof code === "string" && /^[A-Za-z]{2}$/.test(code);
}

// the years Nager.Date has data for
export function isValidYear(year) {
  return Number.isInteger(year) && year >= 1975 && year <= 2075;
}

// The nationwide public holidays of a country in a year: [{ date, name, country }].
// Throws when Nager.Date does not answer.
export async function getOfficialHolidays(countryCode, year) {
  const code = countryCode.toUpperCase();
  const key = `${year}-${code}`;

  const saved = cache.get(key);
  if (saved && Date.now() - saved.time < ONE_DAY) return saved.holidays;

  const res = await fetch(`${BASE}/PublicHolidays/${year}/${code}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Nager.Date answered ${res.status}`);

  const list = await res.json();
  const holidays = list
    .filter((h) => h.global) // only holidays of the whole country
    .map((h) => ({ date: h.date, name: h.name, country: code }));

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value); // remove the oldest one
  cache.set(key, { time: Date.now(), holidays });
  return holidays;
}
