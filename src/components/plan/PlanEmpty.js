"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Ribbon from "@/components/shared/Ribbon";
import { getHolidays } from "@/lib/holidays";
import { holidayLabel } from "@/lib/breaks";
import { makeBreak, formatRange, planPath } from "@/lib/trip";
import { loadTrips, loadSpent, deleteTrip, daysInclusive } from "@/lib/trips";
import heroPhoto from "@/app/images/plan-hero.jpg";
import styles from "./PlanEmpty.module.css";

const SCENE_COLORS = ["violet", "lime", "pink"]; // background of each card header

// the saved trips, each with how much was spent on it
function readTrips() {
  return loadTrips().map((trip) => ({ ...trip, ...loadSpent(trip) }));
}

function money(value) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Mode "empty" of /plan: no getaway chosen. The hero is always the same;
// below it we list the trips the user saved before (if there are any).
export default function PlanEmpty() {
  // this only shows in the browser, so it is safe to read localStorage here
  const [trips, setTrips] = useState(readTrips);
  const [confirmKey, setConfirmKey] = useState(null); // trip waiting for "are you sure?"

  // public holidays of every country + year used by the trips,
  // for example { "KR-2026": [...] }. null means the request failed.
  const [holidays, setHolidays] = useState({});
  const needed = [...new Set(trips.map((t) => `${t.country}-${t.start.slice(0, 4)}`))].join(",");

  useEffect(() => {
    let cancelled = false;

    for (const holidayKey of needed ? needed.split(",") : []) {
      const [country, year] = holidayKey.split("-");
      getHolidays(country, Number(year))
        .then((list) => !cancelled && setHolidays((prev) => ({ ...prev, [holidayKey]: list })))
        .catch(() => !cancelled && setHolidays((prev) => ({ ...prev, [holidayKey]: null })));
    }

    return () => {
      cancelled = true;
    };
  }, [needed]);

  function removeTrip(trip) {
    deleteTrip(trip.country, trip.start, trip.end);
    setTrips(readTrips());
    setConfirmKey(null);
  }

  const n = trips.length;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{n === 0 ? "No trips yet" : `${n} ${n === 1 ? "trip" : "trips"} planned`}</p>
          <h1 className={styles.title}>Your next getaway starts here.</h1>
          <p className={styles.lead}>
            {n === 0
              ? "Find your best dates first. Once you pick a getaway, it shows up here so you can plan the budget and track spending."
              : "Find more dates, or pick up where you left off with the trips below."}
          </p>
          <Link href="/" className={styles.primary}>
            Find getaways →
          </Link>
        </div>

        <div className={styles.art}>
          <Image
            src={heroPhoto}
            alt=""
            fill
            priority
            sizes="(max-width: 860px) 100vw, 50vw"
            className={styles.photo}
          />
        </div>
      </section>

      {n > 0 && (
        <section className={styles.trips} aria-labelledby="your-trips">
          <div className={styles.tripsHead}>
            <h2 id="your-trips">Your trips</h2>
            <span className={styles.saved}>Saved in this browser</span>
          </div>

          <div className={styles.grid}>
            {trips.map((trip, index) => {
              const tripKey = `${trip.country}:${trip.start}:${trip.end}`;
              const holidayList = holidays[`${trip.country}-${trip.start.slice(0, 4)}`];
              return (
                <TripCard
                  key={tripKey}
                  trip={trip}
                  // the days of the getaway; null until the holidays are loaded
                  info={holidayList ? makeBreak(Number(trip.start.slice(0, 4)), holidayList, trip.start, trip.end) : null}
                  scene={SCENE_COLORS[index % SCENE_COLORS.length]}
                  confirming={confirmKey === tripKey}
                  onAskRemove={() => setConfirmKey(tripKey)}
                  onKeep={() => setConfirmKey(null)}
                  onRemove={() => removeTrip(trip)}
                />
              );
            })}

            <Link href="/" className={styles.newCard}>
              <span className={styles.plus} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Plan a new getaway
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

function TripCard({ trip, info, scene, confirming, onAskRemove, onKeep, onRemove }) {
  const range = formatRange(trip);
  const totalDays = daysInclusive(trip.start, trip.end);
  const budget = trip.budgetPerDay * totalDays;
  const percent = budget > 0 ? Math.min((trip.spent / budget) * 100, 100) : 0;
  const started = trip.expenseCount > 0;

  return (
    <article className={styles.card}>
      <div className={`${styles.scene} ${styles[scene]}`}>
        <SceneArt />
        {info && <span className={styles.holidayLabel}>{holidayLabel(info.days)}</span>}
        <button
          type="button"
          className={styles.trash}
          onClick={onAskRemove}
          aria-label={`Remove the trip ${range}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
        </button>
      </div>

      <div className={styles.cardBody}>
        {confirming && (
          <div className={styles.confirm} role="group" aria-label="Confirm remove">
            <span>Remove this trip? Its saved expenses will be deleted too.</span>
            <button type="button" className={`${styles.smallButton} ${styles.dangerSolid}`} onClick={onRemove}>
              Remove
            </button>
            <button type="button" className={styles.smallButton} onClick={onKeep} autoFocus>
              Keep
            </button>
          </div>
        )}

        <p className={styles.destination}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {trip.destination ? trip.destination.name : "Destination not chosen yet"}
        </p>
        <h3>{range}</h3>
        <p className={styles.muted}>
          {info
            ? `${info.total} days off · uses ${info.leave} leave ${info.leave === 1 ? "day" : "days"}`
            : `${totalDays} days off`}
        </p>

        {info && <Ribbon days={info.days} compact />}

        <div className={styles.budget}>
          <div className={styles.budgetRow}>
            <span>
              Spent {money(trip.spent)} of {money(budget)} {trip.currency}
            </span>
            <span className={`${styles.status} ${started ? styles.inProgress : styles.notStarted}`}>
              {started ? "In progress" : "Not started"}
            </span>
          </div>
          <div
            className={styles.track}
            role="progressbar"
            aria-label="Budget spent"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <div className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <Link href={planPath(trip.country, trip)} className={styles.continueButton}>
          Continue planning →
        </Link>
      </div>
    </article>
  );
}

// small sea + sun for the top of a card
function SceneArt() {
  return (
    <svg className={styles.sceneArt} viewBox="0 0 400 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <ellipse cx="70" cy="44" rx="34" ry="9" fill="#fff" opacity="0.8" />
      <circle cx="290" cy="82" r="30" fill="#eea0ff" />
      <rect x="0" y="86" width="400" height="44" fill="#8e84ff" />
      <path
        d="M0 86 Q25 78 50 86 T100 86 T150 86 T200 86 T250 86 T300 86 T350 86 T400 86"
        fill="none"
        stroke="#a8a1ff"
        strokeWidth="4"
      />
    </svg>
  );
}
