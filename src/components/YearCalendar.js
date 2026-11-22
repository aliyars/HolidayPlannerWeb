"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlanner } from "./PlannerProvider";
import { getHolidays } from "@/lib/holidays";
import { buildYear, findBreaks, weekday } from "@/lib/breaks";
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

  return (
    <section>
      <h1 className={styles.title}>Your {year} at a glance</h1>
      <p className={styles.subtitle}>
        Pink days are public holidays. Green days are leave days that bridge them into longer breaks.
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

      <div className={styles.months}>
        {MONTH_NAMES.map((name, m) => (
          <Month key={name} name={name} days={months[m]} leaveDates={leaveDates} />
        ))}
      </div>
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

function Month({ name, days, leaveDates }) {
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
        {days.map((day) => (
          <span
            key={day.date}
            className={`${styles.day} ${cellClass(day)}`}
            title={day.date}
          >
            {Number(day.date.slice(8, 10))}
          </span>
        ))}
      </div>
    </div>
  );
}
