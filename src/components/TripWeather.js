"use client";

import { useEffect, useState } from "react";
import {
  getCapital,
  getForecast,
  getRecordedWeather,
  getPastWeather,
  typicalWeather,
  describeWeather,
} from "@/lib/weather";
import { addDays, weekday, dayOfMonth, WEEKDAYS_SHORT } from "@/lib/breaks";
import styles from "./TripWeather.module.css";

// Weather for the capital of the destination, for every day of the getaway.
// Where the data comes from depends on how far the day is from today:
//   next 16 days (and the last 7)  -> the forecast
//   earlier days                   -> the weather that was recorded
//   later days                     -> what the weather is usually like (past 5 years)
export default function TripWeather({ countryCode, countryName, start, end }) {
  // "key" says which destination and dates the data belongs to, so we know when it is loading
  const key = `${countryCode}|${start}|${end}`;
  const [data, setData] = useState({ key: "", failed: false, city: "", rows: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const capital = await getCapital(countryCode);
      const { latitude, longitude } = capital;

      // the forecast says which days are "now": it covers the last 7 and the next 16 days
      const forecast = await getForecast(latitude, longitude, 7);
      const first = forecast[0]?.date ?? "";
      const last = forecast[forecast.length - 1]?.date ?? "";

      const dates = [];
      for (let d = start; d <= end; d = addDays(d, 1)) dates.push(d);

      // days before the forecast starts: look up what was recorded
      const earlier = dates.filter((d) => first && d < first);
      const recorded =
        earlier.length > 0
          ? await getRecordedWeather(latitude, longitude, earlier[0], earlier[earlier.length - 1]).catch(() => [])
          : [];

      // days after the forecast ends: use the weather of the past 5 years
      const later = dates.some((d) => last && d > last);
      const past = later
        ? await getPastWeather(latitude, longitude, new Date().getFullYear() - 1).catch(() => null)
        : null;

      const rows = dates
        .map((date) => {
          const f = forecast.find((x) => x.date === date);
          if (f) return { date, source: "forecast", code: f.code, max: f.max, min: f.min };

          const r = recorded.find((x) => x.date === date);
          if (r) return { date, source: "recorded", code: r.code, max: r.max, min: r.min };

          const t = past && date > last ? typicalWeather(past, date) : null;
          if (t) return { date, source: "usual", max: t.max, min: t.min, rainChance: t.rainChance };

          return null; // no data for this day
        })
        .filter(Boolean);

      return { city: capital.city, rows };
    }

    load()
      .then(({ city, rows }) => !cancelled && setData({ key, failed: false, city, rows }))
      .catch(() => !cancelled && setData({ key, failed: true, city: "", rows: [] }));

    return () => {
      cancelled = true;
    };
  }, [key, countryCode, start, end]);

  const loading = data.key !== key;
  const hasUsual = data.rows.some((r) => r.source === "usual");
  const hasRecorded = data.rows.some((r) => r.source === "recorded");

  let content;
  if (loading) {
    content = <p className={styles.message}>Loading the weather…</p>;
  } else if (data.failed) {
    content = <p className={styles.message}>We could not load the weather for {countryName}. Please try again later.</p>;
  } else if (data.rows.length === 0) {
    content = <p className={styles.message}>There is no weather data for these days.</p>;
  } else {
    content = (
      <>
        <ul className={styles.days}>
          {data.rows.map((row) => (
            <li key={row.date} className={styles.day}>
              <span className={styles.date}>
                {WEEKDAYS_SHORT[weekday(row.date)]} {dayOfMonth(row.date)}
              </span>

              {row.source === "usual" ? (
                <>
                  <WeatherIcon kind="usual" />
                  <span className={styles.label}>
                    Usually
                    <span className={styles.sub}>rain on ~{row.rainChance}% of days</span>
                  </span>
                </>
              ) : (
                <>
                  <WeatherIcon kind={describeWeather(row.code).kind} />
                  <span className={styles.label}>{describeWeather(row.code).label}</span>
                </>
              )}

              <span className={styles.temps}>
                {Math.round(row.max)}°<span className={styles.low}> / {Math.round(row.min)}°</span>
              </span>
            </li>
          ))}
        </ul>

        {hasUsual && (
          <p className={styles.note}>
            Days further away show what the weather is usually like (the average of the past 5 years). The real
            forecast appears about two weeks before you leave.
          </p>
        )}
        {hasRecorded && <p className={styles.note}>Days that already passed show the weather that was recorded.</p>}
      </>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="trip-weather">
      <h2 id="trip-weather">Trip weather</h2>
      {data.city && !data.failed && (
        <p className={styles.place}>
          {data.city}, {countryName} · °C
        </p>
      )}
      {content}
    </section>
  );
}

// small icons drawn with simple SVG shapes
function WeatherIcon({ kind }) {
  const common = {
    className: styles.icon,
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  const cloud = "M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 .5 9z";

  switch (kind) {
    case "usual": // a thermometer: "this is the usual temperature"
      return (
        <svg {...common}>
          <path d="M14 14.76V5.5a2.5 2.5 0 0 0-5 0v9.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
    case "clear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </svg>
      );
    case "partly":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 2v1M2 8h1M3.8 3.8l.7.7M12.2 3.8l-.7.7" />
          <path d="M9 20a3.5 3.5 0 0 1-.4-7A4.5 4.5 0 0 1 17 11.5 3.8 3.8 0 0 1 17 20z" />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path d="M4 8h16M3 12h18M5 16h14M8 20h8" />
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path d={cloud} transform="translate(0 -3)" />
          <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path d={cloud} transform="translate(0 -3)" />
          <path d="M8 19.5h.01M12 20.5h.01M16 19.5h.01" strokeWidth="2.6" />
        </svg>
      );
    case "storm":
      return (
        <svg {...common}>
          <path d={cloud} transform="translate(0 -3)" />
          <path d="M12 15l-2 3h3l-2 3" />
        </svg>
      );
    default: // cloudy
      return (
        <svg {...common}>
          <path d={cloud} />
        </svg>
      );
  }
}
