import { parseDate } from "./breaks";

// "Your trips": the getaways the user opened on /plan, saved in localStorage.
//
// localStorage "holiday-planner:trips" holds a list like:
//   [
//     {
//       country: "KR",                              // country of the public holidays
//       start: "2026-02-13",
//       end: "2026-02-18",
//       destination: { code: "JP", name: "Japan" }, // where the user wants to go
//       budgetPerDay: 100,
//       currency: "USD",                            // currency of the budget
//     },
//   ]
// The expenses of a trip are NOT in this list. They are saved by the Expenses
// component under their own key, "holiday-planner:expenses:KR:2026-02-13:2026-02-18".
const TRIPS_KEY = "holiday-planner:trips";

// what a new trip starts with
export const DEFAULT_TRIP = {
  destination: { code: "JP", name: "Japan" },
  budgetPerDay: 100,
  currency: "USD",
};

// same id as the one Expenses uses: country + start + end
export function tripId({ country, start, end }) {
  return `${country}:${start}:${end}`;
}

function expensesKey(trip) {
  return `holiday-planner:expenses:${tripId(trip)}`;
}

// localStorage can be blocked (private mode), so always use try/catch
function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // saving failed, the app still works until the page is refreshed
  }
}

// All saved trips. Broken items are skipped and missing fields get the defaults.
export function loadTrips() {
  const saved = readJson(TRIPS_KEY);
  if (!Array.isArray(saved)) return [];

  return saved
    .filter((t) => t && typeof t.country === "string" && typeof t.start === "string" && typeof t.end === "string")
    .map((t) => ({
      country: t.country,
      start: t.start,
      end: t.end,
      destination:
        typeof t.destination?.code === "string" && typeof t.destination?.name === "string"
          ? t.destination
          : DEFAULT_TRIP.destination,
      budgetPerDay: Number.isFinite(t.budgetPerDay) ? t.budgetPerDay : DEFAULT_TRIP.budgetPerDay,
      currency: typeof t.currency === "string" ? t.currency : DEFAULT_TRIP.currency,
    }));
}

// Save a getaway if it is not in the list yet. Returns the saved trip
// (the old one if it already existed), so the page can restore its budget.
export function saveTripIfNew({ country, start, end }) {
  const trips = loadTrips();
  const existing = trips.find((t) => tripId(t) === tripId({ country, start, end }));
  if (existing) return existing;

  const trip = { country, start, end, ...DEFAULT_TRIP };
  writeJson(TRIPS_KEY, [...trips, trip]);
  return trip;
}

// Change some fields of a saved trip, for example { budgetPerDay: 150 }
export function updateTrip(country, start, end, changes) {
  const id = tripId({ country, start, end });
  const trips = loadTrips().map((t) => (tripId(t) === id ? { ...t, ...changes } : t));
  writeJson(TRIPS_KEY, trips);
}

// Remove a trip from the list, together with its saved expenses
export function deleteTrip(country, start, end) {
  const id = tripId({ country, start, end });
  writeJson(
    TRIPS_KEY,
    loadTrips().filter((t) => tripId(t) !== id)
  );
  try {
    localStorage.removeItem(expensesKey({ country, start, end }));
  } catch {
    // ignore
  }
}

// How much was spent on a trip so far: { spent, expenseCount }
// (reads what the Expenses component saved; the first version saved just a list)
export function loadSpent(trip) {
  const saved = readJson(expensesKey(trip));
  const expenses = Array.isArray(saved) ? saved : Array.isArray(saved?.expenses) ? saved.expenses : [];
  return {
    spent: expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    expenseCount: expenses.length,
  };
}

// Number of days from start to end, both included
export function daysInclusive(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / 86400000) + 1;
}
