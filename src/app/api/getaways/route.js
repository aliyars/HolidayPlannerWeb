import { NextResponse } from "next/server";
import { getOfficialHolidays, isValidCountry, isValidYear } from "@/lib/server/nager";
import { buildYear, findBreaks } from "@/lib/breaks";
import { cleanCustomList, expandCustomHolidays } from "@/lib/customHolidays";

// POST /api/getaways
// The browser sends what the user chose, OUR server does the search and sends the result back.
//
// Request (JSON):
//   { country: "KR", year: 2026, leaveDays: 2, mode: "value" | "all",
//     custom: [{ date, end, name }] }   <- the holidays the user added (they live in the browser)
// Answer (JSON):
//   { getaways: [...], officialCount: 18, customCount: 0 }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request must be JSON" }, { status: 400 });
  }

  const country = String(body?.country ?? "");
  const year = Number(body?.year);
  const leaveDays = Number(body?.leaveDays);
  const useAllLeave = body?.mode === "all";

  if (!isValidCountry(country) || !isValidYear(year) || !Number.isInteger(leaveDays) || leaveDays < 1 || leaveDays > 15) {
    return NextResponse.json(
      { error: "Send country (2 letters), year (1975-2075) and leaveDays (1-15)" },
      { status: 400 }
    );
  }

  try {
    // 1. the official holidays (kept in memory by the server)
    const official = await getOfficialHolidays(country, year);

    // 2. add the holidays of the user (an official holiday on the same date wins)
    const known = new Set(official.map((h) => h.date));
    const own = expandCustomHolidays(cleanCustomList(body?.custom), year)
      .filter((h) => !known.has(h.date))
      .map((h) => ({ date: h.date, name: h.name, country: country.toUpperCase(), custom: true }));

    // 3. the search (the same algorithm as always)
    const days = buildYear(year, [...official, ...own]);
    const getaways = findBreaks(days, leaveDays, undefined, useAllLeave);

    return NextResponse.json({ getaways, officialCount: official.length, customCount: own.length });
  } catch {
    return NextResponse.json({ error: "Could not load the holidays" }, { status: 502 });
  }
}
