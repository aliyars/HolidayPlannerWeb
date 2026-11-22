"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHolidays } from "@/lib/holidays";
import { buildYear, findBreaks, holidayLabel, formatDay } from "@/lib/breaks";
import { planPath } from "@/lib/trip";
import Ribbon from "./Ribbon";
import styles from "./FindBreaks.module.css";

const FEW_HOLIDAYS = 10; // fewer official holidays than this: the data may be incomplete

// The best getaways of ONE country. The Find getaways page shows one of these,
// or two (one per country) in the two-country mode. Each list loads and
// searches on its own, so the two countries never mix.
//   waiting - true while a share link is still being applied
//   version - goes up when the user adds or removes a holiday of their own, to search again
export default function GetawayList({ country, year, leaveDays, waiting, title, version }) {
  // "key" says which country/year the data belongs to, so we know when it is still loading
  const key = `${country.code}-${year}-${version}`;
  const [holidayData, setHolidayData] = useState({ key: "", holidays: [], error: "" });

  useEffect(() => {
    let cancelled = false;
    getHolidays(country.code, year)
      .then((holidays) => !cancelled && setHolidayData({ key, holidays, error: "" }))
      .catch((err) => !cancelled && setHolidayData({ key, holidays: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [country.code, year, key]);

  const loading = holidayData.key !== key || waiting;

  // Some countries have few holidays in the API (for example, the religious holidays are missing).
  // Warn when there are only a few, unless the user already added holidays of their own.
  const officialCount = holidayData.holidays.filter((h) => !h.custom).length;
  const hasOwn = holidayData.holidays.some((h) => h.custom);
  const maybeIncomplete = !loading && !holidayData.error && officialCount < FEW_HOLIDAYS && !hasOwn;

  const breaks = loading ? [] : findBreaks(buildYear(year, holidayData.holidays), leaveDays);

  // findBreaks gives the best getaway first. It stays on top, the others
  // follow in the order of the calendar (the dates are "YYYY-MM-DD", so they sort as text).
  const sortedBreaks =
    breaks.length > 0 ? [breaks[0], ...breaks.slice(1).sort((a, b) => a.start.localeCompare(b.start))] : [];

  return (
    <section>
      <div className={styles.listHead}>
        <h2>{title}</h2>
      </div>

      {maybeIncomplete && (
        <p className={styles.dataWarning} role="note">
          Holiday data for {country.name} may be incomplete (
          {officialCount === 0 ? "no public holidays found" : `only ${officialCount} public holidays found`}). If one
          is missing, add it under “My holidays”.
        </p>
      )}

      {loading && <p className={styles.message}>Loading holidays…</p>}
      {holidayData.error && !loading && <p className={styles.message}>{holidayData.error}. Please try again.</p>}
      {!loading && !holidayData.error && breaks.length === 0 && (
        <p className={styles.message}>No getaways found for these settings.</p>
      )}

      {/* the cards change their layout depending on the width of this box */}
      <div className={styles.cards}>
        {sortedBreaks.map((b, index) => (
          <BreakCard key={b.start} item={b} best={index === 0} planHref={planPath(country.code, b)} />
        ))}
      </div>
    </section>
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
          {item.total} days off · uses {item.leave} leave {item.leave === 1 ? "day" : "days"}
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
