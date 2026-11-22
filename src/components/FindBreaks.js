"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlanner } from "./PlannerProvider";
import { getCountries, getHolidays, getNextHolidays } from "@/lib/holidays";
import {
  buildYear,
  findBreaks,
  holidayLabel,
  weekday,
  formatDay,
  monthName,
  dayOfMonth,
  parseDate,
  WEEKDAYS_LONG,
} from "@/lib/breaks";
import { planPath, readSearchParams, searchPath } from "@/lib/trip";
import Ribbon from "./Ribbon";
import HowItWorks from "./HowItWorks";
import styles from "./FindBreaks.module.css";

const YEARS = [2025, 2026, 2027, 2028];

export default function FindBreaks() {
  const { country, setCountry, year, setYear, leaveDays, setLeaveDays } =
    usePlanner();
  const router = useRouter();

  // share link: /?country=KR&year=2026&leave=2 (null when there is none, or it is not valid)
  const link = readSearchParams(useSearchParams());
  const linkCountry = link?.country;
  const linkYear = link?.year;
  const linkLeave = link?.leaveDays;
  // until the link is applied we show "loading", not the results of the default search
  const [linkDone, setLinkDone] = useState(() => link === null);

  // form fields (only applied when the user presses "Find getaways")
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
    let cancelled = false;

    getCountries()
      .then((list) => {
        if (cancelled) return;
        const all = list.map((c) => ({ code: c.countryCode, name: c.name }));
        setCountries(all);

        // a share link fills the form and shows its results straight away
        const found = linkCountry && all.find((c) => c.code === linkCountry);
        if (found) {
          setCountry(found);
          setYear(linkYear);
          setLeaveDays(linkLeave);
          setCountryCode(found.code);
          setFormYear(linkYear);
          setFormLeave(String(linkLeave));
        }
        setLinkDone(true);
      })
      .catch(() => !cancelled && setLinkDone(true));

    return () => {
      cancelled = true;
    };
  }, [linkCountry, linkYear, linkLeave, setCountry, setYear, setLeaveDays]);

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

  // a year from a share link may be outside the usual list, so add it
  const yearOptions = YEARS.includes(Number(formYear))
    ? YEARS
    : [...YEARS, Number(formYear)].sort();

  const loading = holidayData.key !== key || !linkDone;
  const breaks = loading
    ? []
    : findBreaks(buildYear(year, holidayData.holidays), leaveDays);
  // findBreaks gives the best getaway first. It stays on top, the others
  // follow in the order of the calendar (the dates are "YYYY-MM-DD", so they sort as text).
  const sortedBreaks =
    breaks.length > 0
      ? [breaks[0], ...breaks.slice(1).sort((a, b) => a.start.localeCompare(b.start))]
      : [];

  const comingUp =
    upcoming.code === country.code ? upcoming.holidays.slice(0, 3) : [];

  function handleSubmit(event) {
    event.preventDefault();
    const found = countries.find((c) => c.code === countryCode);
    const leave = Math.min(Math.max(parseInt(formLeave, 10) || 1, 1), 15);

    setCountry(found || country);
    setYear(Number(formYear));
    setLeaveDays(leave);
    setFormLeave(String(leave));

    // put the search in the address bar, so the link can be shared
    router.replace(searchPath((found || country).code, Number(formYear), leave), { scroll: false });
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
            <div className={`${styles.field} ${styles.fieldCountry}`}>
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
                {yearOptions.map((y) => (
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
              Find getaways
            </button>
          </form>
        </div>
      </section>

      <HowItWorks />

      <div className={styles.layout}>
        <section>
          <div className={styles.listHead}>
            <h2>
              Best getaways for up to {leaveDays} leave{" "}
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
              No getaways found for these settings.
            </p>
          )}

          {/* the cards change their layout depending on the width of this box */}
          <div className={styles.cards}>
            {sortedBreaks.map((b, index) => (
              <BreakCard
                key={b.start}
                item={b}
                best={index === 0}
                planHref={planPath(country.code, b)}
              />
            ))}
          </div>
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

function BreakCard({ item, best, planHref }) {
  const ratio = Math.round(item.ratio * 10) / 10;

  return (
    <article className={`${styles.breakCard} ${best ? styles.breakCardBest : ""}`}>
      <div className={styles.breakInfo}>
        <div className={styles.labelRow}>
          <span className={styles.holidayLabel}>{holidayLabel(item.days)}</span>
          {best && <span className={styles.badge}>Best pick</span>}
        </div>
        <h3>
          {formatDay(item.start)} – {formatDay(item.end)}
        </h3>
        <p className={styles.muted}>
          {item.total} days off · uses {item.leave} leave{" "}
          {item.leave === 1 ? "day" : "days"}
        </p>
      </div>

      {/* around: also show one normal day before and after the getaway */}
      <div className={styles.breakRibbon}>
        <Ribbon days={item.days} around compact />
      </div>

      <div className={styles.breakAction}>
        <p className={styles.ratio}>{ratio}×</p>
        <p className={styles.muted}>days off per leave day</p>
        <Link href={planHref} className={styles.planButton}>
          Plan this getaway →
        </Link>
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

