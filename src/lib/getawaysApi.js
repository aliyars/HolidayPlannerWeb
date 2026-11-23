import { loadCustomHolidays } from "./customHolidays";

// Ask OUR server to search the getaways (POST /api/getaways, see app/api/getaways/route.js).
// The holidays the user added live in the browser, so they are sent along with the request.
// Result: { getaways: [...], officialCount, customCount }
export async function fetchGetaways({ country, year, leaveDays, useAllLeave }) {
  const message = "Could not load the holidays";

  let res;
  try {
    res = await fetch("/api/getaways", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country,
        year,
        leaveDays,
        mode: useAllLeave ? "all" : "value",
        custom: loadCustomHolidays(country),
      }),
    });
  } catch {
    throw new Error(message); // no internet
  }

  if (!res.ok) throw new Error(message);
  return res.json();
}
