import { addDays, buildYear, formatDay, parseDate, toIso } from "./breaks";

// Rebuild a break from the dates in a share link.
export function makeBreak(year, holidays, start, end) {
  const days = buildYear(year, holidays)
    .filter((d) => d.date >= start && d.date <= end)
    .map((d) => ({ date: d.date, kind: d.type === "work" ? "leave" : d.type, name: d.name }));

  if (days.length === 0) return null;

  const leave = days.filter((d) => d.kind === "leave").length;
  return {
    start: days[0].date,
    end: days[days.length - 1].date,
    leave,
    total: days.length,
    ratio: leave === 0 ? days.length : days.length / leave,
    days,
  };
}

// "May 1 – May 5, 2026"
export function formatRange(b) {
  const year = parseDate(b.end).getUTCFullYear();
  return `${formatDay(b.start)} – ${formatDay(b.end)}, ${year}`;
}

// The chosen getaway lives in the URL: /plan?country=KR&start=2026-02-13&end=2026-02-18
export function planPath(countryCode, b) {
  const params = new URLSearchParams({ country: countryCode, start: b.start, end: b.end });
  return `/plan?${params.toString()}`;
}

// Share link of the Find getaways page: /?country=KR&year=2026&leave=2
export function searchPath(countryCode, year, leaveDays) {
  const params = new URLSearchParams({ country: countryCode, year: String(year), leave: String(leaveDays) });
  return `/?${params.toString()}`;
}

// Read that link. Returns { country, year, leaveDays }, or null if a value is missing or wrong.
export function readSearchParams(params) {
  const country = params.get("country");
  const year = Number(params.get("year"));
  const leaveDays = Number(params.get("leave"));

  const valid =
    /^[A-Za-z]{2}$/.test(country ?? "") &&
    Number.isInteger(year) &&
    year >= 1975 && // the range Nager.Date has data for
    year <= 2075 &&
    Number.isInteger(leaveDays) &&
    leaveDays >= 1 &&
    leaveDays <= 15;

  return valid ? { country: country.toUpperCase(), year, leaveDays } : null;
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

// "2026-02-30" looks right but is not a real date
function isRealDate(text) {
  return DATE_FORMAT.test(text) && toIso(parseDate(text)) === text;
}

// Read the URL parameters of /plan. The result says which mode to show:
//   "empty"   - no (or incomplete) parameters
//   "invalid" - all parameters are there but they make no sense
//   "getaway" - a getaway was chosen (country, start, end, year)
export function readPlanParams(params) {
  const country = params.get("country");
  const start = params.get("start");
  const end = params.get("end");

  if (!country || !start || !end) return { mode: "empty" };

  const valid =
    /^[A-Za-z]{2}$/.test(country) &&
    isRealDate(start) &&
    isRealDate(end) &&
    start <= end &&
    start.slice(0, 4) === end.slice(0, 4); // a break stays inside one year

  if (!valid) return { mode: "invalid" };

  return { mode: "getaway", country: country.toUpperCase(), start, end, year: Number(start.slice(0, 4)) };
}

// The reminder for a leave day pops up this many days before it,
// which leaves time to ask your boss for the day off.
const LEAVE_REMINDER_DAYS = 7;

// In .ics text, \ ; , and new lines have a special meaning, so they are escaped
function escapeText(text) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

// .ics file with:
//  - one all-day event for the whole getaway
//  - one all-day event for every leave day, each with a reminder (VALARM)
export function buildIcs(b, title) {
  const compact = (iso) => iso.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Holiday Planner//EN", "CALSCALE:GREGORIAN"];

  function addEvent({ uid, first, last, summary, description, reminder }) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@holiday-planner`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(first)}`,
      // the end date of an all-day event is exclusive, so add one day
      `DTEND;VALUE=DATE:${compact(addDays(last, 1))}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`
    );
    if (reminder) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(summary)}`,
        `TRIGGER:-P${LEAVE_REMINDER_DAYS}D`, // before the start of the event
        "END:VALARM"
      );
    }
    lines.push("END:VEVENT");
  }

  addEvent({
    uid: `${compact(b.start)}-${compact(b.end)}`,
    first: b.start,
    last: b.end,
    summary: title,
    description: `${b.total} days off, ${b.leave} leave ${b.leave === 1 ? "day" : "days"}`,
  });

  for (const day of b.days) {
    if (day.kind !== "leave") continue;
    addEvent({
      uid: `leave-${compact(day.date)}`,
      first: day.date,
      last: day.date,
      summary: `Take leave: ${title}`,
      description: `Leave day for your getaway ${formatDay(b.start)} – ${formatDay(b.end)}.`,
      reminder: true,
    });
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
