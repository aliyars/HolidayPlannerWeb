"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlanner } from "./PlannerProvider";
import { getCountries, getNextHolidays } from "@/lib/holidays";
import { weekday, monthName, dayOfMonth, parseDate, WEEKDAYS_LONG } from "@/lib/breaks";
import { readSearchParams, searchPath } from "@/lib/trip";
import GetawayList from "./GetawayList";
import HowItWorks from "./HowItWorks";
import MyHolidays from "./MyHolidays";
import styles from "./FindBreaks.module.css";

const YEARS = [2025, 2026, 2027, 2028];

export default function FindBreaks() {
  const { country, setCountry, country2, setCountry2, year, setYear, leaveDays, setLeaveDays } = usePlanner();
  const router = useRouter();

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

  // goes up when the user adds or removes a holiday of their own, so the lists search again
  const [holidaysVersion, setHolidaysVersion] = useState(0);
  const holidaysChanged = () => setHolidaysVersion((v) => v + 1);

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
        }
        setLinkDone(true);
      })
      .catch(() => !cancelled && setLinkDone(true));

    return () => {
      cancelled = true;
    };
  }, [linkCountry, linkCountry2, linkYear, linkLeave, setCountry, setCountry2, setYear, setLeaveDays]);

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

    // put the search in the address bar, so the link can be shared
    router.replace(searchPath(first.code, Number(formYear), leave, second?.code), { scroll: false });
  }

  const leaveText = `${leaveDays} leave ${leaveDays === 1 ? "day" : "days"}`;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.hi}>Hi there, where to next?</p>
          <h1 className={styles.title}>Turn a few leave days into a real holiday.</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={`${styles.field} ${styles.fieldCountry}`}>
              <label htmlFor="country">Country</label>
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
          </form>
        </div>
      </section>

      <HowItWorks />

      <div className={styles.layout}>
        {/* one list per country: the two countries are searched separately and never mixed */}
        <div className={styles.lists}>
          {country2 && <p className={styles.sharedNote}>Up to {leaveText} in each country.</p>}

          <GetawayList
            country={country}
            year={year}
            leaveDays={leaveDays}
            waiting={!linkDone}
            version={holidaysVersion}
            title={country2 ? `Best getaways in ${country.name}` : `Best getaways for up to ${leaveText}`}
          />

          {country2 && (
            <GetawayList
              country={country2}
              year={year}
              leaveDays={leaveDays}
              waiting={!linkDone}
              version={holidaysVersion}
              title={`Best getaways in ${country2.name}`}
            />
          )}
        </div>

        <aside className={styles.side}>
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
        </aside>
      </div>
    </>
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
