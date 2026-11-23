"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlanner } from "@/components/layout/PlannerProvider";
import { getCountries, getNextHolidays } from "@/lib/holidays";
import { weekday, monthName, dayOfMonth, parseDate, WEEKDAYS_LONG } from "@/lib/breaks";
import { readSearchParams, searchPath } from "@/lib/trip";
import { getMyPosition, getCountryAt } from "@/lib/location";
import GetawayList from "./GetawayList";
import HowItWorks from "./HowItWorks";
import MyHolidays from "./MyHolidays";
import styles from "./FindGetaways.module.css";

const YEARS = [2025, 2026, 2027, 2028];

export default function FindGetaways() {
  const { country, setCountry, country2, setCountry2, year, setYear, leaveDays, setLeaveDays, searched, setSearched } =
    usePlanner();
  const router = useRouter();
  const resultsRef = useRef(null); // the results: the page scrolls here after a search

  // share link: /?country=KR&year=2026&leave=2 (and &country2=ID in the two-country mode)
  // It is null when there is none, or it is not valid.
  const link = readSearchParams(useSearchParams());
  const linkCountry = link?.country;
  const linkCountry2 = link?.country2;
  const linkYear = link?.year;
  const linkLeave = link?.leaveDays;
  // until the link is applied we show "loading", not the results of the default search
  const [linkDone, setLinkDone] = useState(() => link === null);

  // form fields (only applied when the user presses "Find getaways")
  const [countryCode, setCountryCode] = useState(country.code);
  const [countryCode2, setCountryCode2] = useState(country2?.code ?? ""); // "" = no second country
  const [formYear, setFormYear] = useState(year);
  const [formLeave, setFormLeave] = useState(String(leaveDays));

  const [countries, setCountries] = useState([country]);

  // "Use my location"
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState(""); // what happened, shown under the form

  // goes up when the user adds or removes a holiday of their own, so the lists search again
  const [holidaysVersion, setHolidaysVersion] = useState(0);
  const holidaysChanged = () => setHolidaysVersion((v) => v + 1);

  // How the getaways are chosen: false = "Best value" (most days off per leave day),
  // true = "Use my leave days" (the longest ones that use all the leave days)
  const [useAllLeave, setUseAllLeave] = useState(false);

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
          const found2 = linkCountry2 ? all.find((c) => c.code === linkCountry2) : null;
          setCountry(found);
          setCountry2(found2 || null);
          setYear(linkYear);
          setLeaveDays(linkLeave);
          setCountryCode(found.code);
          setCountryCode2(found2 ? found2.code : "");
          setFormYear(linkYear);
          setFormLeave(String(linkLeave));
          setSearched(true);
        }
        setLinkDone(true);
      })
      .catch(() => !cancelled && setLinkDone(true));

    return () => {
      cancelled = true;
    };
  }, [linkCountry, linkCountry2, linkYear, linkLeave, setCountry, setCountry2, setYear, setLeaveDays, setSearched]);

  // a year from a share link may be outside the usual list, so add it
  const yearOptions = YEARS.includes(Number(formYear)) ? YEARS : [...YEARS, Number(formYear)].sort();

  function handleSubmit(event) {
    event.preventDefault();
    const first = countries.find((c) => c.code === countryCode) || country;
    // a second country only counts when it is a different one
    const second = countryCode2 && countryCode2 !== first.code ? countries.find((c) => c.code === countryCode2) : null;
    const leave = Math.min(Math.max(parseInt(formLeave, 10) || 1, 1), 15);

    setCountry(first);
    setCountry2(second || null);
    setYear(Number(formYear));
    setLeaveDays(leave);
    setFormLeave(String(leave));

    // from now on the results are shown
    setSearched(true);

    // put the search in the address bar, so the link can be shared
    router.replace(searchPath(first.code, Number(formYear), leave, second?.code), { scroll: false });

    // scroll down to the results (without animation for people who turned animations off)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
    );
  }

  // Fill in the country where the user is. The browser asks the user for permission first,
  // and the coordinates are only used to find the country (nothing is saved).
  async function findMyCountry() {
    setLocating(true);
    setLocationNote("");

    try {
      const { latitude, longitude } = await getMyPosition();
      const code = await getCountryAt(latitude, longitude);
      const found = countries.find((c) => c.code === code);

      if (found) {
        setCountryCode(found.code);
        if (countryCode2 === found.code) setCountryCode2(""); // the two countries must be different
        setLocationNote(`You are in ${found.name}. Press “Find getaways” to search.`);
      } else {
        setLocationNote("We found where you are, but we have no holiday data for that country. Please choose one.");
      }
    } catch (error) {
      // error.code 1 = the user said no
      setLocationNote(
        error?.code === 1
          ? "Location access was blocked. You can allow it in your browser, or choose a country from the list."
          : "We could not find your location. Please choose a country from the list."
      );
    }

    setLocating(false);
  }

  // The results show after a search, or when the page is opened with a share link.
  // Before that there is only a short invitation to search.
  const showResults = searched || link !== null;

  const leaveText = `${leaveDays} leave ${leaveDays === 1 ? "day" : "days"}`;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.hi}>Hi there, where to next?</p>
          <h1 className={styles.title}>Turn a few leave days into a real holiday.</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={`${styles.field} ${styles.fieldCountry}`}>
              <div className={styles.labelWithAction}>
                <label htmlFor="country">Country</label>
                <button type="button" className={styles.locate} onClick={findMyCountry} disabled={locating}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  {locating ? "Locating…" : "Use my location"}
                </button>
              </div>
              <select id="country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.field} ${styles.fieldCountry}`}>
              <label htmlFor="country2">Second country (optional)</label>
              <select id="country2" value={countryCode2} onChange={(e) => setCountryCode2(e.target.value)}>
                <option value="">None</option>
                {countries
                  .filter((c) => c.code !== countryCode)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="year">Year</label>
              <select id="year" value={formYear} onChange={(e) => setFormYear(e.target.value)}>
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

            {locationNote && (
              <p className={styles.locationNote} role="status">
                {locationNote}
              </p>
            )}
          </form>
        </div>
      </section>

      <HowItWorks />

      <div ref={resultsRef} className={styles.resultsAnchor}>
        {!showResults ? (
          <ResultsPlaceholder />
        ) : (
          <div className={styles.layout}>
            {/* one list per country: the two countries are searched separately and never mixed */}
            <div className={styles.lists}>
              {/* choose how the getaways are ranked */}
              <div>
                <div className={styles.modeSwitch} role="group" aria-label="How to choose the getaways">
                  <button
                    type="button"
                    className={`${styles.modeButton} ${!useAllLeave ? styles.modeActive : ""}`}
                    aria-pressed={!useAllLeave}
                    onClick={() => setUseAllLeave(false)}
                  >
                    Best value
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeButton} ${useAllLeave ? styles.modeActive : ""}`}
                    aria-pressed={useAllLeave}
                    onClick={() => setUseAllLeave(true)}
                  >
                    Use my leave days
                  </button>
                </div>
                <p className={styles.modeHint}>
                  {useAllLeave
                    ? "The longest holidays that use all your leave days."
                    : "The most days off for every leave day you spend."}
                </p>
              </div>

              {country2 && (
                <p className={styles.sharedNote}>
                  {useAllLeave ? "Using exactly" : "Up to"} {leaveText} in each country.
                </p>
              )}

              <GetawayList
                country={country}
                year={year}
                leaveDays={leaveDays}
                waiting={!linkDone}
                version={holidaysVersion}
                useAllLeave={useAllLeave}
                title={
                  country2 ? (
                    <>
                      {useAllLeave ? "Longest getaways" : "Best getaways"} in{" "}
                      <span className={styles.highlight}>{country.name}</span>
                    </>
                  ) : useAllLeave ? (
                    `Longest getaways using ${leaveText}`
                  ) : (
                    `Best getaways for up to ${leaveText}`
                  )
                }
              />

              {country2 && (
                <GetawayList
                  country={country2}
                  year={year}
                  leaveDays={leaveDays}
                  waiting={!linkDone}
                  version={holidaysVersion}
                  useAllLeave={useAllLeave}
                  title={
                    <>
                      {useAllLeave ? "Longest getaways" : "Best getaways"} in{" "}
                      <span className={styles.highlight}>{country2.name}</span>
                    </>
                  }
                />
              )}
            </div>

            <aside className={styles.side}>
              {/* the legend is first, so the colours are explained before the user reads the cards */}
              <div className={styles.card}>
                <h3>How to read it</h3>
                <ul className={styles.legend}>
                  <li>
                    <span className={`${styles.swatch} ${styles.holiday}`} /> Public holiday
                  </li>
                  <li>
                    <span className={`${styles.swatch} ${styles.leave}`} /> Take leave
                  </li>
                  <li>
                    <span className={`${styles.swatch} ${styles.weekend}`} /> Weekend
                  </li>
                  <li>
                    <span className={`${styles.swatch} ${styles.normal}`} /> Normal day
                  </li>
                </ul>
              </div>

              <div className={styles.card}>
                <h3>Coming up</h3>
                <ComingUp country={country} count={country2 ? 2 : 3} showName={Boolean(country2)} />
                {country2 && <ComingUp country={country2} count={2} showName />}
              </div>

              <div className={styles.card}>
                <h3>My holidays</h3>
                <p className={styles.cardHint}>Missing a public holiday? Add it here and it counts in the results.</p>
                <MyHolidays
                  key={country.code}
                  country={country}
                  year={year}
                  showName={Boolean(country2)}
                  onChange={holidaysChanged}
                />
                {country2 && (
                  <MyHolidays key={country2.code} country={country2} year={year} showName onChange={holidaysChanged} />
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

// Shown instead of the results until the user searches
function ResultsPlaceholder() {
  return (
    <section className={styles.placeholder} aria-live="polite">
      <span className={styles.placeholderIcon} aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      </span>
      <h2>Your getaways will show up here</h2>
      <p>Pick a country, a year and how many leave days you have, then press “Find getaways”.</p>
    </section>
  );
}

// The next public holidays of one country (from the API). showName adds the country name,
// which is needed when two countries are shown below each other.
function ComingUp({ country, count, showName }) {
  const [upcoming, setUpcoming] = useState({ code: "", holidays: [] });

  useEffect(() => {
    let cancelled = false;
    getNextHolidays(country.code)
      .then((holidays) => !cancelled && setUpcoming({ code: country.code, holidays }))
      .catch(() => !cancelled && setUpcoming({ code: country.code, holidays: [] }));
    return () => {
      cancelled = true;
    };
  }, [country.code]);

  const items = upcoming.code === country.code ? upcoming.holidays.slice(0, count) : [];

  return (
    <div className={showName ? styles.upcomingGroup : ""}>
      {showName && <p className={styles.upcomingCountry}>{country.name}</p>}
      {items.length === 0 && <p className={styles.muted}>Nothing to show yet.</p>}
      {items.map((h) => (
        <UpcomingItem key={h.date} holiday={h} />
      ))}
    </div>
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
