"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePlanner } from "./PlannerProvider";
import Expenses from "./Expenses";
import { getCountries, getHolidays } from "@/lib/holidays";
import { getCurrencies, getRate } from "@/lib/currency";
import { weekday, dayOfMonth, WEEKDAYS_SHORT } from "@/lib/breaks";
import { makeBreak, formatRange, buildShareLink, buildIcs, downloadFile } from "@/lib/trip";
import styles from "./PlanTrip.module.css";

function formatMoney(value) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function PlanTrip() {
  const params = useSearchParams();
  const { country, setCountry, year, setYear, leaveDays, setLeaveDays, selectedBreak, setSelectedBreak } =
    usePlanner();

  // ----- opening a share link -----
  const linkCountry = params.get("country");
  const linkYear = Number(params.get("year"));
  const linkLeave = Number(params.get("leave"));
  const linkStart = params.get("start");
  const linkEnd = params.get("end");
  const hasLink = Boolean(linkCountry && linkYear && linkStart && linkEnd);
  const [linkFailed, setLinkFailed] = useState(false);

  useEffect(() => {
    if (!hasLink || selectedBreak) return;
    let cancelled = false;

    Promise.all([getHolidays(linkCountry, linkYear), getCountries()])
      .then(([holidays, countries]) => {
        if (cancelled) return;
        const found = countries.find((c) => c.countryCode === linkCountry);
        const b = makeBreak(linkYear, holidays, linkStart, linkEnd);
        if (!found || !b) {
          setLinkFailed(true);
          return;
        }
        setCountry({ code: found.countryCode, name: found.name });
        setYear(linkYear);
        setLeaveDays(linkLeave || b.leave);
        setSelectedBreak(b);
      })
      .catch(() => !cancelled && setLinkFailed(true));

    return () => {
      cancelled = true;
    };
  }, [hasLink, selectedBreak, linkCountry, linkYear, linkLeave, linkStart, linkEnd, setCountry, setYear, setLeaveDays, setSelectedBreak]);

  // ----- budget -----
  const [destinations, setDestinations] = useState([{ countryCode: "JP", name: "Japan" }]);
  const [currencies, setCurrencies] = useState({ USD: "US Dollar", JPY: "Japanese Yen" });
  const [destination, setDestination] = useState("JP");
  const [perDay, setPerDay] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
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

  if (!selectedBreak) {
    return (
      <section className={styles.empty}>
        <h1>Plan trip</h1>
        {hasLink && !linkFailed ? (
          <p>Loading your trip…</p>
        ) : (
          <>
            <p>{linkFailed ? "We could not open that trip link." : "Pick a getaway first, then plan it here."}</p>
            <Link href="/" className={styles.primaryLink}>
              Find getaways
            </Link>
          </>
        )}
      </section>
    );
  }

  const trip = selectedBreak;
  const destinationName = destinations.find((d) => d.countryCode === destination)?.name || destination;
  const budgetPerDay = Number(perDay) || 0;
  const total = budgetPerDay * trip.total;
  const rate = rateData.key === rateKey ? rateData.rate : null;

  // expenses are saved per getaway (country + dates)
  const tripKey = `${country.code}:${trip.start}:${trip.end}`;

  function downloadIcs() {
    downloadFile("holiday-trip.ics", buildIcs(trip, `Trip to ${destinationName}`), "text/calendar");
  }

  async function copyLink() {
    const link = buildShareLink(window.location.origin, country.code, year, leaveDays, trip);
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
                <select id="destination" value={destination} onChange={(e) => setDestination(e.target.value)}>
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
                  onChange={(e) => setPerDay(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="from">Your currency</label>
                <select id="from" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
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
                {copied ? "Link copied!" : "Copy share link"}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
