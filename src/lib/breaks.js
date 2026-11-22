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

// Every day of the year, with a type: "holiday", "weekend" or "work".
export function buildYear(year, holidays) {
  const holidayByDate = new Map(holidays.map((h) => [h.date, h]));
  const days = [];

  for (let t = Date.UTC(year, 0, 1); t < Date.UTC(year + 1, 0, 1); t += DAY_MS) {
    const date = toIso(new Date(t));
    const dow = weekday(date);

    let type = "work";
    if (holidayByDate.has(date)) type = "holiday";
    else if (dow === 0 || dow === 6) type = "weekend";

    days.push({ date, type });
  }
  return days;
}

// Find the best breaks: the most days off for the fewest leave days.
//
// A break is a stretch of days in a row. Holidays and weekends are free,
// work days inside the stretch are the leave days we have to take.
// The stretch must be "full": the day before and after it are work days
// (otherwise we could simply make the break longer for free).
export function findBreaks(days, maxLeave, howMany = 3) {
  const isWork = (i) => days[i].type === "work";
  const options = [];

  for (let start = 0; start < days.length; start++) {
    if (start > 0 && !isWork(start - 1)) continue;

    let leave = 0;
    let freeDays = 0;

    for (let end = start; end < days.length; end++) {
      if (isWork(end)) {
        leave++;
        if (leave > maxLeave) break;
      } else {
        freeDays++;
      }

      const stretchEnds = end === days.length - 1 || isWork(end + 1);
      if (stretchEnds && leave >= 1 && freeDays >= 1) {
        const total = end - start + 1;
        options.push({ start, end, leave, total, ratio: total / leave });
      }
    }
  }

  // best ratio first, then the longer break, then the earlier date
  options.sort((a, b) => b.ratio - a.ratio || b.total - a.total || a.start - b.start);

  // take the best ones that don't overlap each other
  const chosen = [];
  for (const o of options) {
    const overlaps = chosen.some((c) => o.start <= c.end && o.end >= c.start);
    if (!overlaps) chosen.push(o);
    if (chosen.length === howMany) break;
  }

  return chosen.map((o) => ({
    start: days[o.start].date,
    end: days[o.end].date,
    leave: o.leave,
    total: o.total,
    ratio: o.ratio,
    days: days.slice(o.start, o.end + 1).map((d) => ({
      date: d.date,
      kind: d.type === "work" ? "leave" : d.type,
    })),
  }));
}
