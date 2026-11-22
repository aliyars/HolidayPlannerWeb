import { addDays } from "./breaks";

// Public holidays the user added by hand, because the API data is not complete
// (for example, some countries miss their religious holidays).
// A holiday can be one day or a range of days (for example, Idul Fitri with the days around it).
//
// localStorage "holiday-planner:custom-holidays" holds one list per country:
//   { "ID": [{ date: "2026-03-20", end: "2026-03-24", name: "Idul Fitri" }], "KR": [] }
//   date = first day, end = last day (the same as date for a holiday of one day)
// They are merged into the holidays of the API in getHolidays (lib/holidays.js), so every
// page (getaways, calendar, trips) uses them without any extra work.
const KEY = "holiday-planner:custom-holidays";
const MAX_NAME = 40;
const MAX_DAYS = 31; // the longest holiday we accept
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

// localStorage can be blocked (private mode), so always use try/catch
function readAll() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // saving failed, the app still works until the page is refreshed
  }
}

function byDate(a, b) {
  return a.date.localeCompare(b.date);
}

// The holidays added for a country (all years), in the order of the calendar:
// [{ date, end, name }]
export function loadCustomHolidays(countryCode) {
  const list = readAll()[countryCode];
  if (!Array.isArray(list)) return [];

  return list
    .filter((h) => typeof h?.date === "string" && DATE_FORMAT.test(h.date) && typeof h.name === "string" && h.name)
    .map((h) => ({
      date: h.date,
      end: typeof h.end === "string" && DATE_FORMAT.test(h.end) && h.end >= h.date ? h.end : h.date,
      name: h.name,
    }))
    .sort(byDate);
}

// Number of days from start to end, both included
function lengthOf(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
}

// Add a holiday from `start` to `end` (end can be empty for one day).
// Returns an error message, or "" when it worked.
export function addCustomHoliday(countryCode, start, end, rawName) {
  const name = rawName.trim();
  const last = end || start;

  if (!DATE_FORMAT.test(start)) return "Choose the first day.";
  if (!DATE_FORMAT.test(last)) return "Choose a valid last day.";
  if (last < start) return "The last day is before the first day.";
  if (lengthOf(start, last) > MAX_DAYS) return `A holiday can last at most ${MAX_DAYS} days.`;
  if (!name) return "Give the holiday a name.";

  const list = loadCustomHolidays(countryCode);
  // two ranges overlap when each one starts before the other one ends
  if (list.some((h) => start <= h.end && last >= h.date)) return "That overlaps a holiday you already added.";

  const all = readAll();
  all[countryCode] = [...list, { date: start, end: last, name: name.slice(0, MAX_NAME) }].sort(byDate);
  writeAll(all);
  return "";
}

// Remove a holiday. It is found by its first day.
export function deleteCustomHoliday(countryCode, startDate) {
  const all = readAll();
  all[countryCode] = loadCustomHolidays(countryCode).filter((h) => h.date !== startDate);
  writeAll(all);
}

// The added holidays of one year, as one item per day: [{ date, name }].
// A range turns into a day for every date from its first to its last day.
export function customHolidaysInYear(countryCode, year) {
  const days = [];
  for (const h of loadCustomHolidays(countryCode)) {
    for (let d = h.date; d <= h.end; d = addDays(d, 1)) {
      if (d.startsWith(`${year}-`)) days.push({ date: d, name: h.name });
    }
  }
  return days;
}
