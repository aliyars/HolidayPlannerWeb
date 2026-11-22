import { addDays, buildYear, formatDay, parseDate } from "./breaks";

// Rebuild a break from the dates in a share link.
export function makeBreak(year, holidays, start, end) {
  const days = buildYear(year, holidays)
    .filter((d) => d.date >= start && d.date <= end)
    .map((d) => ({ date: d.date, kind: d.type === "work" ? "leave" : d.type }));

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

// The link keeps country, year, leave days and the break dates in the URL.
export function buildShareLink(origin, countryCode, year, leaveDays, b) {
  const params = new URLSearchParams({
    country: countryCode,
    year: String(year),
    leave: String(leaveDays),
    start: b.start,
    end: b.end,
  });
  return `${origin}/plan?${params.toString()}`;
}

// .ics file with one all-day event for the break
export function buildIcs(b, title) {
  const compact = (iso) => iso.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Holiday Planner//EN",
    "BEGIN:VEVENT",
    `UID:${compact(b.start)}-${compact(b.end)}@holiday-planner`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(b.start)}`,
    // the end date of an all-day event is exclusive, so add one day
    `DTEND;VALUE=DATE:${compact(addDays(b.end, 1))}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${b.total} days off, ${b.leave} leave ${b.leave === 1 ? "day" : "days"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
