"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlanner } from "./PlannerProvider";
import { getHolidays } from "@/lib/holidays";
import { buildYear, findBreaks, weekday, formatDay, WEEKDAYS_LONG } from "@/lib/breaks";
import { getCapital, getForecast, getPastWeather } from "@/lib/weather";
import DayTooltip from "./DayTooltip";
import styles from "./YearCalendar.module.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEK_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function YearCalendar() {
  const { country, year, leaveDays } = usePlanner();

  // "key" says which country/year the data belongs to, so we know when it is loading
  const [data, setData] = useState({ key: "", holidays: [], error: "" });
  const key = `${country.code}-${year}`;

  useEffect(() => {
    let cancelled = false;
    getHolidays(country.code, year)
      .then((holidays) => !cancelled && setData({ key, holidays, error: "" }))
      .catch((err) => !cancelled && setData({ key, holidays: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [country.code, year, key]);

  // Weather of the capital of the selected country (where the user lives): the forecast of
  // the next 16 days, and what every date is usually like (from the past 5 years).
  // "key" is the country the weather belongs to.
  const [weather, setWeather] = useState({ key: "", status: "loading", city: "", forecast: [], past: null });

  useEffect(() => {
    let cancelled = false;

    getCapital(country.code)
      .then(async (capital) => {
        const lastYear = new Date().getFullYear() - 1;
        const [forecast, past] = await Promise.all([
          // if only the forecast fails, we can still show what the weather is usually like
          getForecast(capital.latitude, capital.longitude).catch(() => []),
          getPastWeather(capital.latitude, capital.longitude, lastYear),
        ]);
        return { capital, forecast, past };
      })
      .then(
        ({ capital, forecast, past }) =>
          !cancelled && setWeather({ key: country.code, status: "ok", city: capital.city, forecast, past })
      )
      .catch(
        () => !cancelled && setWeather({ key: country.code, status: "failed", city: "", forecast: [], past: null })
      );

    return () => {
      cancelled = true;
    };
  }, [country.code]);

  const weatherNow =
    weather.key === country.code ? weather : { status: "loading", city: "", forecast: [], past: null };

  // the day the user points at: { date, x, y, below } (where to show the box)
  const [active, setActive] = useState(null);

  // hide the box when the page scrolls or Escape is pressed
  useEffect(() => {
    if (!active) return;
    const hide = () => setActive(null);
    const onKey = (e) => e.key === "Escape" && hide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const loading = data.key !== key;

  if (loading || data.error) {
    return (
      <section>
        <h1 className={styles.title}>Your {year} at a glance</h1>
        <p className={styles.message}>{data.error ? `${data.error}. Please try again.` : "Loading holidays…"}</p>
      </section>
    );
  }

  const days = buildYear(year, data.holidays);

  // dates of the suggested leave days (from the best getaways)
  const leaveDates = new Set();
  for (const b of findBreaks(days, leaveDays)) {
    for (const d of b.days) {
      if (d.kind === "leave") leaveDates.add(d.date);
    }
  }

  // group the days by month, and count the holidays per month
  const months = MONTH_NAMES.map(() => []);
  const counts = MONTH_NAMES.map(() => 0);
  for (const d of days) {
    const m = Number(d.date.slice(5, 7)) - 1;
    months[m].push(d);
    if (d.type === "holiday") counts[m]++;
  }

  const emptyMonths = MONTH_NAMES.filter((name, m) => counts[m] === 0);

  // show the box above the day (or under it when there is no room above)
  function showDay(date, element) {
    const rect = element.getBoundingClientRect();
    const below = rect.top < 260;
    const x = Math.min(Math.max(rect.left + rect.width / 2, 140), window.innerWidth - 140); // stay on screen
    setActive({ date, x, y: below ? rect.bottom + 8 : rect.top - 8, below });
  }

  const activeDay = active ? days.find((d) => d.date === active.date) : null;

  return (
    <section>
      <h1 className={styles.title}>Your {year} at a glance</h1>
      <p className={styles.subtitle}>
        Pink days are public holidays. Green days are leave days that bridge them into longer getaways.
      </p>

      <div className={styles.top}>
        <HolidayChart counts={counts} />

        <div className={styles.note}>
          <h2>Months with no holidays</h2>
          <p>
            {emptyMonths.length > 0
              ? `${joinList(emptyMonths)} ${emptyMonths.length === 1 ? "has" : "have"} no public holidays. A few leave days there go a long way.`
              : "Every month has at least one public holiday."}
          </p>
          <Link href="/" className={styles.noteButton}>
            See best getaways
          </Link>
        </div>
      </div>

      <ul className={styles.legend}>
        <li><span className={`${styles.swatch} ${styles.holiday}`} /> Public holiday</li>
        <li><span className={`${styles.swatch} ${styles.leave}`} /> Suggested leave</li>
        <li><span className={`${styles.swatch} ${styles.weekend}`} /> Weekend</li>
      </ul>

      <p className={styles.hint}>Hover or tap a day to see its holiday and the weather.</p>

      <div className={styles.months}>
        {MONTH_NAMES.map((name, m) => (
          <Month
            key={name}
            name={name}
            days={months[m]}
            leaveDates={leaveDates}
            onShow={showDay}
            onHide={() => setActive(null)}
          />
        ))}
      </div>

      {activeDay && (
        <DayTooltip
          day={activeDay}
          isLeave={leaveDates.has(activeDay.date)}
          weather={weatherNow}
          position={active}
        />
      )}
    </section>
  );
}

// "April, July and November"
function joinList(names) {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function HolidayChart({ counts }) {
  const max = Math.max(...counts, 1);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h2>Holidays per month</h2>
      </div>

      <div className={styles.chart}>
        {counts.map((count, m) => (
          <div key={m} className={styles.barColumn}>
            <span className={styles.barValue}>{count}</span>
            <div className={styles.barArea}>
              <div
                className={`${styles.bar} ${count === 0 ? styles.barEmpty : ""}`}
                style={{ height: count === 0 ? "8px" : `${(count / max) * 100}%` }}
              />
            </div>
            <span className={styles.barLabel}>{MONTH_NAMES[m].slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Month({ name, days, leaveDates, onShow, onHide }) {
  // empty cells before the 1st so the days line up under S M T W T F S
  const firstWeekday = weekday(days[0].date);
  const blanks = Array.from({ length: firstWeekday });

  function cellClass(day) {
    if (day.type === "holiday") return styles.holiday;
    if (leaveDates.has(day.date)) return styles.leave;
    if (day.type === "weekend") return styles.weekend;
    return "";
  }

  return (
    <div className={styles.month}>
      <h3>{name}</h3>
      <div className={styles.grid}>
        {WEEK_LETTERS.map((letter, i) => (
          <span key={i} className={styles.weekday}>
            {letter}
          </span>
        ))}
        {blanks.map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isLeave = leaveDates.has(day.date);
          let description = "";
          if (day.type === "holiday") description = `, ${day.name}, public holiday`;
          else if (isLeave) description = ", suggested leave day";
          else if (day.type === "weekend") description = ", weekend";

          return (
            <button
              type="button"
              key={day.date}
              className={`${styles.day} ${cellClass(day)}`}
              // 365 tab stops would be too many: only holidays and leave days can be reached with Tab
              tabIndex={day.type === "holiday" || isLeave ? 0 : -1}
              aria-label={`${WEEKDAYS_LONG[weekday(day.date)]} ${formatDay(day.date)}${description}`}
              onMouseEnter={(e) => onShow(day.date, e.currentTarget)}
              onFocus={(e) => onShow(day.date, e.currentTarget)}
              onClick={(e) => onShow(day.date, e.currentTarget)}
              onMouseLeave={onHide}
              onBlur={onHide}
            >
              {Number(day.date.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
