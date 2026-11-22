"use client";

import { useState } from "react";
import { loadCustomHolidays, addCustomHoliday, deleteCustomHoliday } from "@/lib/customHolidays";
import { weekday, formatDay, WEEKDAYS_SHORT } from "@/lib/breaks";
import { daysInclusive } from "@/lib/trips";
import styles from "./MyHolidays.module.css";

// The holidays the user added for ONE country, with a small form to add more.
// A holiday is one day, or a range from a first to a last day.
//   showName - show the country name above (needed when two countries are shown)
//   onChange - called after adding or deleting, so the results are searched again
export default function MyHolidays({ country, year, showName, onChange }) {
  // this only shows in the browser, so it is safe to read localStorage when the state is created
  const [list, setList] = useState(() => loadCustomHolidays(country.code));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(""); // empty = a holiday of one day
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // only the holidays of the year that is shown
  const shown = list.filter((h) => h.date.startsWith(`${year}-`));
  const id = `my-${country.code}`;

  function handleAdd(event) {
    event.preventDefault();
    if (!from.startsWith(`${year}-`) || (to && !to.startsWith(`${year}-`))) {
      setError(`Choose dates in ${year}.`);
      return;
    }

    const problem = addCustomHoliday(country.code, from, to, name);
    if (problem) {
      setError(problem);
      return;
    }

    setList(loadCustomHolidays(country.code));
    setFrom("");
    setTo("");
    setName("");
    setError("");
    onChange();
  }

  function handleDelete(startDate) {
    deleteCustomHoliday(country.code, startDate);
    setList(loadCustomHolidays(country.code));
    onChange();
  }

  return (
    <div className={styles.group}>
      {showName && <p className={styles.groupName}>{country.name}</p>}

      {shown.length === 0 ? (
        <p className={styles.empty}>Nothing added for {year} yet.</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((h) => {
            const days = daysInclusive(h.date, h.end);
            return (
              <li key={h.date} className={styles.item}>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.itemText}>
                  {h.name}
                  <span className={styles.itemDate}>
                    {days === 1
                      ? `${WEEKDAYS_SHORT[weekday(h.date)]}, ${formatDay(h.date)}`
                      : `${formatDay(h.date)} – ${formatDay(h.end)} · ${days} days`}
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => handleDelete(h.date)}
                  aria-label={`Remove ${h.name} (${formatDay(h.date)})`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form className={styles.form} onSubmit={handleAdd} noValidate>
        <div className={styles.dates}>
          <div className={styles.field}>
            <label htmlFor={`${id}-from`}>From</label>
            <input
              id={`${id}-from`}
              type="date"
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-to`}>To (optional)</label>
            <input
              id={`${id}-to`}
              type="date"
              min={from || `${year}-01-01`}
              max={`${year}-12-31`}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-name`}>Name</label>
          <input
            id={`${id}-name`}
            type="text"
            maxLength={40}
            placeholder="e.g. Idul Fitri"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <p className={styles.formHint}>Leave “To” empty for a holiday of one day.</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={styles.add}>
          Add holiday
        </button>
      </form>
    </div>
  );
}
