"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchGetaways } from "@/lib/getawaysApi";
import { holidayLabel, formatDay } from "@/lib/breaks";
import { planPath } from "@/lib/trip";
import Ribbon from "@/components/shared/Ribbon";
import styles from "./FindGetaways.module.css";

const FEW_HOLIDAYS = 10; // fewer official holidays than this: the data may be incomplete

// The best getaways of ONE country. The Find getaways page shows one of these,
// or two (one per country) in the two-country mode. Each list loads and
// searches on its own, so the two countries never mix.
//   waiting - true while a share link is still being applied
//   version - goes up when the user adds or removes a holiday of their own, to search again
//   useAllLeave - false: best value (most days off per leave day); true: use all my leave days
export default function GetawayList({ country, year, leaveDays, waiting, title, version, useAllLeave = false }) {
  // The search is done by OUR server (POST /api/getaways): we send what the user chose and
  // get the list of getaways back.
  // "key" says which choices the answer belongs to, so we know when it is still loading.
  const key = `${country.code}-${year}-${leaveDays}-${useAllLeave}-${version}`;
  const [result, setResult] = useState({ key: "", data: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    fetchGetaways({ country: country.code, year, leaveDays, useAllLeave })
      .then((data) => !cancelled && setResult({ key, data, error: "" }))
      .catch((err) => !cancelled && setResult({ key, data: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key, country.code, year, leaveDays, useAllLeave]);

  const loading = result.key !== key || waiting;

  // Some countries have few holidays in the API (for example, the religious holidays are missing).
  // Warn when there are only a few, unless the user already added holidays of their own.
  const officialCount = result.data?.officialCount ?? 0;
  const hasOwn = (result.data?.customCount ?? 0) > 0;
  const maybeIncomplete = !loading && Boolean(result.data) && officialCount < FEW_HOLIDAYS && !hasOwn;

  const breaks = loading || !result.data ? [] : result.data.getaways;

  // the server gives the best getaway first. It stays on top, the others
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
          {officialCount === 0 ? "no nationwide holidays found" : `only ${officialCount} nationwide holidays found`}).
          Holidays that apply to only some regions are not counted. If one is missing, add it under “My holidays”.
        </p>
      )}

      {/* while the holidays load: grey blocks in the shape of the cards (a "skeleton") */}
      {loading && (
        <div role="status" aria-label="Loading holidays">
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      )}
      {result.error && !loading && <p className={styles.message}>{result.error}. Please try again.</p>}
      {!loading && !result.error && breaks.length === 0 && (
        <p className={styles.message}>
          {useAllLeave
            ? `No getaway uses exactly ${leaveDays} leave ${leaveDays === 1 ? "day" : "days"} in ${year}. Try another number, or switch to “Best value”.`
            : "No getaways found for these settings."}
        </p>
      )}

      {/* the cards change their layout depending on the width of this box */}
      <div className={styles.cards}>
        {sortedBreaks.map((b, index) => (
          <BreakCard key={b.start} item={b} index={index} best={index === 0} planHref={planPath(country.code, b)} />
        ))}
      </div>
    </section>
  );
}

function BreakCard({ item, index, best, planHref }) {
  const ratio = Math.round(item.ratio * 10) / 10;

  return (
    <article
      className={`${styles.breakCard} ${best ? styles.breakCardBest : ""} ${item.days.length > 6 ? styles.breakCardLong : ""}`}
      style={{ "--i": index }} // the cards appear one after another (see .breakCard in the CSS)
    >
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
