import { addDays } from "./breaks";

// Weather for the trip and for the year calendar.
//   World Bank API: the capital city of a country and its coordinates
//   Open-Meteo API: the forecast, and the weather of past years (free, no key)

// The capital of a country, for example { city: "Tokyo", latitude: 35.67, longitude: 139.77 }
export async function getCapital(countryCode) {
  const res = await fetch(`https://api.worldbank.org/v2/country/${countryCode}?format=json`);
  if (!res.ok) throw new Error("Could not find the destination");

  const data = await res.json();
  const country = data?.[1]?.[0]; // the first item is only page info
  const hasPlace = country && country.capitalCity && country.latitude !== "" && country.longitude !== "";
  if (!hasPlace) throw new Error("No place found for this destination");

  return { city: country.capitalCity, latitude: Number(country.latitude), longitude: Number(country.longitude) };
}

// Turn the "daily" part of an Open-Meteo answer into one item per day:
// [{ date: "2026-11-23", code: 63, max: 18.9, min: 9.9 }]
function readDaily(daily) {
  return daily.time
    .map((date, i) => ({
      date,
      code: daily.weather_code[i],
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
    }))
    .filter((d) => d.max !== null && d.min !== null); // the last day can be incomplete
}

// The forecast of the next 16 days (the most Open-Meteo gives), and also the last
// `pastDays` days before today. The dates are the local dates of the destination.
export async function getForecast(latitude, longitude, pastDays = 0) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=16&past_days=${pastDays}&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the forecast");

  return readDaily((await res.json()).daily);
}

// The weather that was recorded on past days (from `start` to `end`, both "YYYY-MM-DD").
// Same shape as getForecast.
export async function getRecordedWeather(latitude, longitude, start, end) {
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${latitude}&longitude=${longitude}&start_date=${start}&end_date=${end}` +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto";

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the recorded weather");

  return readDaily((await res.json()).daily);
}

// The weather of the 5 last complete years (up to `lastYear`), added up per day of the
// year, so we can tell what a date is usually like. It is one request.
// Result: { "02-16": { max, min, rainy, n }, ... }  (sums over the years; rainy = days with rain)
export async function getPastWeather(latitude, longitude, lastYear) {
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&start_date=${lastYear - 4}-01-01&end_date=${lastYear}-12-31` +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto";

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the weather of past years");

  const { daily } = await res.json();
  const sums = {};
  daily.time.forEach((date, i) => {
    const max = daily.temperature_2m_max[i];
    const min = daily.temperature_2m_min[i];
    if (max === null || min === null) return;

    const monthDay = date.slice(5); // "02-16"
    const s = (sums[monthDay] ??= { max: 0, min: 0, rainy: 0, n: 0 });
    s.max += max;
    s.min += min;
    if (daily.precipitation_sum[i] >= 1) s.rainy += 1; // 1 mm or more counts as a rainy day
    s.n += 1;
  });
  return sums;
}

// What a date is usually like: the average of that day and the 3 days before and after it
// (over the past years), because one single day is too random.
// Returns { max, min, rainChance } (rainChance in %), or null when there is no data.
export function typicalWeather(sums, isoDate) {
  let max = 0;
  let min = 0;
  let rainy = 0;
  let n = 0;

  for (let offset = -3; offset <= 3; offset++) {
    const s = sums[addDays(isoDate, offset).slice(5)];
    if (!s) continue;
    max += s.max;
    min += s.min;
    rainy += s.rainy;
    n += s.n;
  }

  return n === 0 ? null : { max: max / n, min: min / n, rainChance: Math.round((rainy / n) * 100) };
}

// Open-Meteo describes the weather with a WMO code. We turn it into a short
// kind (used to pick an icon) and a label.
export function describeWeather(code) {
  if (code === 0) return { kind: "clear", label: "Clear" };
  if (code <= 2) return { kind: "partly", label: "Partly cloudy" };
  if (code === 3) return { kind: "cloudy", label: "Cloudy" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog" };
  if (code >= 51 && code <= 57) return { kind: "rain", label: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: "rain", label: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", label: "Snow" };
  if (code >= 95) return { kind: "storm", label: "Thunderstorm" };
  return { kind: "cloudy", label: "Cloudy" };
}
