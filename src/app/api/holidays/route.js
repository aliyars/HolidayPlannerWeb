import { NextResponse } from "next/server";
import { getOfficialHolidays, isValidCountry, isValidYear } from "@/lib/server/nager";

// GET /api/holidays?country=KR&year=2026
// The browser asks OUR server for the public holidays (not Nager.Date directly).
// Answer: { country, year, holidays: [{ date, name, country }] }
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const country = params.get("country") ?? "";
  const year = Number(params.get("year"));

  if (!isValidCountry(country) || !isValidYear(year)) {
    return NextResponse.json({ error: "Use /api/holidays?country=KR&year=2026" }, { status: 400 });
  }

  try {
    const holidays = await getOfficialHolidays(country, year);
    return NextResponse.json(
      { country: country.toUpperCase(), year, holidays },
      { headers: { "Cache-Control": "public, max-age=3600" } } // the browser may keep it for an hour
    );
  } catch {
    return NextResponse.json({ error: "Could not load the holidays" }, { status: 502 });
  }
}
