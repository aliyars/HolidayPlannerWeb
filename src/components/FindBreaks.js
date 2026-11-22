"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlanner } from "./PlannerProvider";
import { getCountries, getHolidays, getNextHolidays } from "@/lib/holidays";
import {
  buildYear,
  findBreaks,
  addDays,
  weekday,
  formatDay,
  monthName,
  dayOfMonth,
  parseDate,
  WEEKDAYS_SHORT,
  WEEKDAYS_LONG,
} from "@/lib/breaks";
import styles from "./FindBreaks.module.css";

const YEARS = [2025, 2026, 2027, 2028];

export default function FindBreaks() {
  const router = useRouter();
  const {
    country,
    setCountry,
    year,
    setYear,
    leaveDays,
    setLeaveDays,
    setSelectedBreak,
  } = usePlanner();

  // form fields (only applied when the user presses "Find my breaks")
  const [countryCode, setCountryCode] = useState(country.code);
  const [formYear, setFormYear] = useState(year);
  const [formLeave, setFormLeave] = useState(String(leaveDays));

  // data from the API. "key" says which country/year the data belongs to,
  // so we know when it is still loading.
  const [countries, setCountries] = useState([country]);
  const [holidayData, setHolidayData] = useState({
    key: "",
    holidays: [],
    error: "",
  });
  const [upcoming, setUpcoming] = useState({ code: "", holidays: [] });

  const key = `${country.code}-${year}`;

  useEffect(() => {
    getCountries()
      .then((list) =>
        setCountries(list.map((c) => ({ code: c.countryCode, name: c.name }))),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHolidays(country.code, year)
      .then(
        (holidays) =>
          !cancelled && setHolidayData({ key, holidays, error: "" }),
      )
      .catch(
        (err) =>
          !cancelled &&
          setHolidayData({ key, holidays: [], error: err.message }),
      );
    return () => {
      cancelled = true;
    };
  }, [country.code, year, key]);

  useEffect(() => {
    let cancelled = false;
    getNextHolidays(country.code)
      .then(
        (holidays) =>
          !cancelled && setUpcoming({ code: country.code, holidays }),
      )
      .catch(
        () => !cancelled && setUpcoming({ code: country.code, holidays: [] }),
      );
    return () => {
      cancelled = true;
    };
  }, [country.code]);

  const loading = holidayData.key !== key;
  const breaks = loading
    ? []
    : findBreaks(buildYear(year, holidayData.holidays), leaveDays);
  const comingUp =
    upcoming.code === country.code ? upcoming.holidays.slice(0, 2) : [];

  function handleSubmit(event) {
    event.preventDefault();
    const found = countries.find((c) => c.code === countryCode);
    const leave = Math.min(Math.max(parseInt(formLeave, 10) || 1, 1), 15);

    setCountry(found || country);
    setYear(Number(formYear));
    setLeaveDays(leave);
    setFormLeave(String(leave));
  }

  function planTrip(b) {
    setSelectedBreak(b);
    router.push("/plan");
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.hi}>Hi there, where to next?</p>
          <h1 className={styles.title}>
            Turn a few leave days into a real holiday.
          </h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="country">Country</label>
              <select
                id="country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="year">Year</label>
              <select
                id="year"
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="leave">Leave days</label>
              <input
                id="leave"
                type="number"
                min="1"
                max="15"
                value={formLeave}
                onChange={(e) => setFormLeave(e.target.value)}
              />
            </div>

            <button type="submit" className={styles.submit}>
              Find my breaks
            </button>
          </form>
        </div>

        <HeroArt />
      </section>

      <div className={styles.layout}>
        <section>
          <div className={styles.listHead}>
            <h2>
              Best getaways for {leaveDays} leave{" "}
              {leaveDays === 1 ? "day" : "days"}
            </h2>
          </div>

          {loading && <p className={styles.message}>Loading holidays…</p>}
          {holidayData.error && !loading && (
            <p className={styles.message}>
              {holidayData.error}. Please try again.
            </p>
          )}
          {!loading && !holidayData.error && breaks.length === 0 && (
            <p className={styles.message}>
              No breaks found for these settings.
            </p>
          )}

          {breaks.map((b, index) => (
            <BreakCard
              key={b.start}
              item={b}
              best={index === 0}
              onPlan={() => planTrip(b)}
            />
          ))}
        </section>

        <aside className={styles.side}>
          <div className={styles.card}>
            <h3>Coming up</h3>
            {comingUp.length === 0 && (
              <p className={styles.muted}>Nothing to show yet.</p>
            )}
            {comingUp.map((h) => (
              <UpcomingItem key={h.date} holiday={h} />
            ))}
          </div>

          <div className={styles.card}>
            <h3>How to read it</h3>
            <ul className={styles.legend}>
              <li>
                <span className={`${styles.swatch} ${styles.holiday}`} /> Public
                holiday
              </li>
              <li>
                <span className={`${styles.swatch} ${styles.leave}`} /> Take
                leave
              </li>
              <li>
                <span className={`${styles.swatch} ${styles.weekend}`} />{" "}
                Weekend
              </li>
              <li>
                <span className={`${styles.swatch} ${styles.normal}`} /> Normal
                day
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function BreakCard({ item, best, onPlan }) {
  // show one normal day before and after the break
  const before = addDays(item.start, -1);
  const after = addDays(item.end, 1);
  const tiles = [
    { date: before, kind: "normal" },
    ...item.days,
    { date: after, kind: "normal" },
  ];
  const ratio = Math.round(item.ratio * 10) / 10;

  return (
    <article className={styles.breakCard}>
      <div className={styles.breakInfo}>
        {best && <span className={styles.badge}>Best pick</span>}
        <h3>
          {formatDay(item.start)} – {formatDay(item.end)}
        </h3>
        <p className={styles.muted}>
          {item.total} days off · {item.leave} leave{" "}
          {item.leave === 1 ? "day" : "days"}
        </p>
      </div>

      <div className={styles.ribbon}>
        {tiles.map((t) => (
          <div key={t.date} className={`${styles.day} ${styles[t.kind]}`}>
            <span>{WEEKDAYS_SHORT[weekday(t.date)]}</span>
            <strong>{dayOfMonth(t.date)}</strong>
          </div>
        ))}
      </div>

      <div className={styles.breakAction}>
        <p className={styles.ratio}>{ratio}×</p>
        <p className={styles.muted}>days off per leave day</p>
        <button type="button" className={styles.planButton} onClick={onPlan}>
          Plan this trip →
        </button>
      </div>
    </article>
  );
}

function UpcomingItem({ holiday }) {
  const dow = weekday(holiday.date);
  const longWeekend = dow === 1 || dow === 5; // Monday or Friday
  const thisYear = new Date().getFullYear();
  const holidayYear = parseDate(holiday.date).getUTCFullYear();

  let subtitle = WEEKDAYS_LONG[dow];
  if (longWeekend) subtitle += " · long weekend";
  else if (holidayYear !== thisYear) subtitle += `, ${holidayYear}`;

  return (
    <div className={styles.upcoming}>
      <div className={styles.dateBox}>
        <span>{monthName(holiday.date).toUpperCase()}</span>
        <strong>{dayOfMonth(holiday.date)}</strong>
      </div>
      <div>
        <p className={styles.upcomingName}>{holiday.name}</p>
        <p className={styles.muted}>{subtitle}</p>
      </div>
    </div>
  );
}

function HeroArt() {
  return (
    <svg className={styles.art} viewBox="0 0 400 220" aria-hidden="true">
      <circle cx="320" cy="50" r="30" fill="#ececec" />
      <ellipse cx="80" cy="60" rx="38" ry="12" fill="#fff" opacity="0.8" />
      <ellipse cx="115" cy="50" rx="26" ry="11" fill="#fff" opacity="0.8" />
      <path
        d="M40 100 Q150 40 275 72"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeDasharray="8 8"
      />
      <path d="M270 62 l28 6 -24 18 -4 -8 -10 -2z" fill="#fff" />
      <path d="M0 220 V165 Q90 120 190 150 T400 140 V220z" fill="#c8e37a" />
      <path d="M0 220 V185 Q100 165 200 190 T400 175 V220z" fill="#e2f4a6" />
      <circle
        cx="90"
        cy="172"
        r="6"
        fill="#eea0ff"
        stroke="#fff"
        strokeWidth="3"
      />
      <circle
        cx="300"
        cy="190"
        r="6"
        fill="#eea0ff"
        stroke="#fff"
        strokeWidth="3"
      />
      <circle
        cx="370"
        cy="170"
        r="5"
        fill="#eea0ff"
        stroke="#fff"
        strokeWidth="3"
      />
    </svg>
  );
}
