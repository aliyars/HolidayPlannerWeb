"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePlanner } from "./PlannerProvider";
import Expenses from "./Expenses";
import PlanEmpty from "./PlanEmpty";
import { getCountries, getHolidays } from "@/lib/holidays";
import { getCurrencies, getRate } from "@/lib/currency";
import { weekday, dayOfMonth, WEEKDAYS_SHORT } from "@/lib/breaks";
import { makeBreak, formatRange, readPlanParams, buildIcs, downloadFile } from "@/lib/trip";
import { DEFAULT_TRIP, saveTripIfNew, updateTrip } from "@/lib/trips";
import styles from "./PlanTrip.module.css";

function formatMoney(value) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function PlanTrip() {
  const { setCountry, setYear } = usePlanner();

  // ----- which getaway? it comes from the URL -----
  const link = readPlanParams(useSearchParams()); // { mode: "empty" | "invalid" | "getaway", ... }
  const { country: linkCountry, start: linkStart, end: linkEnd, year: linkYear } = link;
  const key = link.mode === "getaway" ? `${linkCountry}:${linkStart}:${linkEnd}` : "";

  // "key" says which getaway the loaded trip belongs to, so we know when it is loading
  const [loaded, setLoaded] = useState({ key: "", trip: null });

  // budget settings of this getaway (they are saved in "Your trips")
  const [destination, setDestination] = useState(DEFAULT_TRIP.destination.code);
  const [perDay, setPerDay] = useState(String(DEFAULT_TRIP.budgetPerDay));
  const [fromCurrency, setFromCurrency] = useState(DEFAULT_TRIP.currency);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    Promise.all([getHolidays(linkCountry, linkYear), getCountries()])
      .then(([holidays, countries]) => {
        if (cancelled) return;
        const found = countries.find((c) => c.countryCode === linkCountry);
        const trip = makeBreak(linkYear, holidays, linkStart, linkEnd);
        setLoaded({ key, trip: found ? trip : null });
        if (found && trip) {
          // the header shows the country and year of this getaway
          setCountry({ code: found.countryCode, name: found.name });
          setYear(linkYear);

          // remember this getaway in "Your trips" and bring back the budget saved with it
          const saved = saveTripIfNew({ country: linkCountry, start: linkStart, end: linkEnd });
          setDestination(saved.destination.code);
          setPerDay(String(saved.budgetPerDay));
          setFromCurrency(saved.currency);
        }
      })
      .catch(() => !cancelled && setLoaded({ key, trip: null }));

    return () => {
      cancelled = true;
    };
  }, [key, linkCountry, linkYear, linkStart, linkEnd, setCountry, setYear]);

  // ----- budget -----
  const [destinations, setDestinations] = useState([{ countryCode: "JP", name: "Japan" }]);
  const [currencies, setCurrencies] = useState({ USD: "US Dollar", JPY: "Japanese Yen" });
  const [toCurrency, setToCurrency] = useState("JPY");
  const [rateData, setRateData] = useState({ key: "", rate: null });

  useEffect(() => {
    getCountries().then(setDestinations).catch(() => {});
    getCurrencies().then(setCurrencies).catch(() => {});
  }, []);

  const rateKey = `${fromCurrency}-${toCurrency}`;
  useEffect(() => {
    let cancelled = false;
    getRate(fromCurrency, toCurrency)
      .then((rate) => !cancelled && setRateData({ key: rateKey, rate }))
      .catch(() => !cancelled && setRateData({ key: rateKey, rate: null }));
    return () => {
      cancelled = true;
    };
  }, [fromCurrency, toCurrency, rateKey]);

  // ----- share -----
  const [copied, setCopied] = useState(false);

  // mode "empty": no getaway chosen yet
  if (link.mode === "empty") return <PlanEmpty />;

  // the link has parameters but they are wrong, or the getaway could not be loaded
  const failed = link.mode === "invalid" || (loaded.key === key && !loaded.trip);
  if (failed) {
    return (
      <section className={styles.empty}>
        <h1>Plan trip</h1>
        <p>We could not open that getaway link.</p>
        <Link href="/" className={styles.primaryLink}>
          Find getaways
        </Link>
      </section>
    );
  }

  if (loaded.key !== key) {
    return (
      <section className={styles.empty}>
        <h1>Plan trip</h1>
        <p>Loading your getaway…</p>
      </section>
    );
  }

  // mode "getaway": a getaway was chosen
  const trip = loaded.trip;
  const destinationName = destinations.find((d) => d.countryCode === destination)?.name || destination;
  const budgetPerDay = Number(perDay) || 0;
  const total = budgetPerDay * trip.total;
  const rate = rateData.key === rateKey ? rateData.rate : null;

  // expenses are saved per getaway (country + dates)
  const tripKey = key;

  // keep the budget settings in "Your trips" up to date
  function saveBudget(changes) {
    updateTrip(linkCountry, linkStart, linkEnd, changes);
  }

  function downloadIcs() {
    downloadFile("holiday-trip.ics", buildIcs(trip, `Trip to ${destinationName}`), "text/calendar");
  }

  async function copyLink() {
    const link = window.location.href; // the URL already holds country, start and end
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }

  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.label}>Your break</p>
          <h1 className={styles.title}>{formatRange(trip)}</h1>
          <p className={styles.sub}>
            {trip.total} days off · only {trip.leave} leave {trip.leave === 1 ? "day" : "days"}
          </p>
        </div>

        <div className={styles.ribbon}>
          {trip.days.map((d) => (
            <div key={d.date} className={`${styles.day} ${styles[d.kind]}`}>
              <span>{WEEKDAYS_SHORT[weekday(d.date)]}</span>
              <strong>{dayOfMonth(d.date)}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card}>
            <h2>Trip budget</h2>

            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="destination">Destination</label>
                <select
                  id="destination"
                  value={destination}
                  onChange={(e) => {
                    const code = e.target.value;
                    setDestination(code);
                    saveBudget({
                      destination: { code, name: destinations.find((d) => d.countryCode === code)?.name || code },
                    });
                  }}
                >
                  {destinations.map((d) => (
                    <option key={d.countryCode} value={d.countryCode}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="perDay">Budget per day</label>
                <input
                  id="perDay"
                  type="number"
                  min="0"
                  value={perDay}
                  onChange={(e) => {
                    setPerDay(e.target.value);
                    saveBudget({ budgetPerDay: Number(e.target.value) || 0 });
                  }}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="from">Your currency</label>
                <select
                  id="from"
                  value={fromCurrency}
                  onChange={(e) => {
                    setFromCurrency(e.target.value);
                    saveBudget({ currency: e.target.value });
                  }}
                >
                  {Object.keys(currencies).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="to">Show in</label>
                <select id="to" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
                  {Object.keys(currencies).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.total}>
              <p className={styles.muted}>Total for {trip.total} days</p>
              <p className={styles.totalValue}>
                {formatMoney(total)} {fromCurrency}
              </p>
              <p className={styles.muted}>
                {rate === null
                  ? "Loading exchange rate…"
                  : `≈ ${formatMoney(total * rate)} ${toCurrency} · today's rate`}
              </p>
            </div>
          </section>

          <section className={styles.card}>
            {/* key makes the expenses reload when the getaway changes */}
            <Expenses
              key={tripKey}
              tripKey={tripKey}
              currency={fromCurrency}
              budgetTotal={total}
            />
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.card}>
            <h2>Save &amp; share</h2>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} onClick={downloadIcs}>
                Add to calendar (.ics)
              </button>
              <button type="button" className={styles.outlineButton} onClick={copyLink}>
                Copy share link
              </button>
            </div>

            {/* the notification; role="status" makes screen readers read it out */}
            <div role="status" aria-live="polite">
              {copied && <span className={styles.toast}>Link copied</span>}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
