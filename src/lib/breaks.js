const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_MS = 24 * 60 * 60 * 1000;

// Dates are "YYYY-MM-DD" strings. We use UTC so time zones never shift a day.
export function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  return toIso(new Date(parseDate(iso).getTime() + n * DAY_MS));
}

export function weekday(iso) {
  return parseDate(iso).getUTCDay(); // 0 = Sunday
}

export function formatDay(iso) {
  const d = parseDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function monthName(iso) {
  return MONTHS[parseDate(iso).getUTCMonth()];
}

export function dayOfMonth(iso) {
  return parseDate(iso).getUTCDate();
}

// Every day of the year, with ONE type per day:
//   "holiday" - public holiday (from Nager.Date)
//   "weekend" - Saturday or Sunday
//   "work"    - a normal working day
// Each date is only one entry, so a holiday that falls on a weekend
// is counted once, not twice.
export function buildYear(year, holidays) {
  const holidayByDate = new Map(holidays.map((h) => [h.date, h]));
  const days = [];

  for (let t = Date.UTC(year, 0, 1); t < Date.UTC(year + 1, 0, 1); t += DAY_MS) {
    const date = toIso(new Date(t));
    const dow = weekday(date);

    let type = "work";
    if (holidayByDate.has(date)) type = "holiday";
    else if (dow === 0 || dow === 6) type = "weekend";

    const holiday = holidayByDate.get(date);
    days.push({ date, type, name: holiday?.name ?? null, custom: Boolean(holiday?.custom) });
  }
  return days;
}

export const MAX_GETAWAYS = 5; // show at most this many getaways
const MIN_DAYS_OFF = 3; // a getaway has at least this many days off in a row

// Find the best getaways: the most days off for the fewest leave days.
//
// A getaway is a stretch of days in a row where we do not work:
//   - weekends and public holidays are free days off
//   - a work day inside the stretch is a leave day (we must take it off)
// Rules: it uses at most `maxLeave` leave days (and at least 1), has at least
// MIN_DAYS_OFF days off, and contains at least one public holiday.
//
// The stretch must be "full": the day before and the day after it are work days
// (otherwise we could make the getaway longer without using any leave).
export function findBreaks(days, maxLeave, howMany = MAX_GETAWAYS) {
  const isWork = (i) => days[i].type === "work";
  const options = [];

  // Step 1: try every start day. A start is only allowed right after a work day
  // (or on the first day of the year), so we never begin in the middle of a rest.
  for (let start = 0; start < days.length; start++) {
    if (start > 0 && !isWork(start - 1)) continue;

    let leave = 0; // work days used as leave so far
    let holidays = 0; // public holidays inside the stretch

    // Step 2: stretch the end day by day and count what we use.
    for (let end = start; end < days.length; end++) {
      if (isWork(end)) {
        leave++;
        if (leave > maxLeave) break; // too many leave days, stop stretching
      } else if (days[end].type === "holiday") {
        holidays++;
      }

      // Step 3: the stretch is "full" when the next day is a work day (or the year ends).
      // Keep it only if it follows all the rules.
      const total = end - start + 1;
      const isFull = end === days.length - 1 || isWork(end + 1);
      if (isFull && leave >= 1 && holidays >= 1 && total >= MIN_DAYS_OFF) {
        options.push({ start, end, leave, total, ratio: total / leave });
      }
    }
  }

  // Step 4: best first. Highest ratio (days off per leave day), then the longer
  // getaway, then the earlier date.
  options.sort((a, b) => b.ratio - a.ratio || b.total - a.total || a.start - b.start);

  // Step 5: walk down the sorted list and keep a getaway only if its dates do not
  // overlap one we already kept. So the best one always wins. Stop at `howMany`.
  const chosen = [];
  for (const o of options) {
    const overlaps = chosen.some((c) => o.start <= c.end && o.end >= c.start);
    if (!overlaps) chosen.push(o);
    if (chosen.length === howMany) break;
  }

  return chosen.map((o) => {
    const stretch = days.slice(o.start, o.end + 1);
    return {
      start: days[o.start].date,
      end: days[o.end].date,
      leave: o.leave,
      total: o.total,
      ratio: o.ratio,
      days: stretch.map((d) => ({
        date: d.date,
        kind: d.type === "work" ? "leave" : d.type,
        name: d.name, // name of the public holiday (null on other days)
      })),
    };
  });
}

// The short label shown on a getaway card, made from the public holiday names
// (the "name" field of Nager.Date) of the days in the getaway.
// `days` is the list of days of a getaway: [{ date, kind, name }].
//   1 name   -> "Chuseok"
//   2 names  -> "Christmas Eve · Christmas Day"
//   3+ names -> "Christmas Eve +2"   (the first name + how many more)
//   no name  -> "Long weekend"
export function holidayLabel(days) {
  const names = [];
  for (const d of days) {
    // a holiday of several days has the same name every day, so keep each name once
    if (d.kind === "holiday" && d.name && !names.includes(d.name)) names.push(d.name);
  }

  if (names.length === 0) return "Long weekend";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} · ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}
