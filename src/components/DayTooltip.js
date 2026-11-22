import { weekday, formatDay, WEEKDAYS_LONG } from "@/lib/breaks";
import { typicalWeather, describeWeather } from "@/lib/weather";
import styles from "./DayTooltip.module.css";

// The small box that shows when the user hovers (or taps) a day of the year calendar:
// what kind of day it is (with the name of the public holiday) and the weather.
//   day      - { date, type, name } from buildYear
//   isLeave  - true if this is a suggested leave day
//   weather  - { status: "loading" | "failed" | "ok", city, forecast: [...], past: {...} }
//   position - { x, y, below } where to show it (screen coordinates)
export default function DayTooltip({ day, isLeave, weather, position }) {
  const forecast = weather.forecast?.find((f) => f.date === day.date);
  const typical = weather.past ? typicalWeather(weather.past, day.date) : null;

  return (
    <div
      className={styles.tooltip}
      role="tooltip"
      style={{
        left: position.x,
        top: position.y,
        transform: position.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }}
    >
      <p className={styles.date}>
        {WEEKDAYS_LONG[weekday(day.date)]}, {formatDay(day.date)}
      </p>

      <DayStatus day={day} isLeave={isLeave} />

      <div className={styles.weather}>
        <h4>Weather{weather.city ? ` in ${weather.city}` : ""}</h4>
        {weather.status === "loading" && <p className={styles.muted}>Loading…</p>}
        {weather.status === "failed" && <p className={styles.muted}>Weather is not available right now.</p>}
        {weather.status === "ok" && forecast && (
          <p>
            <span className={styles.muted}>Forecast · </span>
            {describeWeather(forecast.code).label} ·{" "}
            <span className={styles.temps}>
              {Math.round(forecast.max)}° / {Math.round(forecast.min)}°
            </span>
          </p>
        )}
        {weather.status === "ok" && !forecast && typical && (
          <p>
            <span className={styles.muted}>Usually </span>
            <span className={styles.temps}>
              {Math.round(typical.max)}° / {Math.round(typical.min)}°
            </span>
            <br />
            <span className={styles.muted}>Rain on about {typical.rainChance}% of days</span>
          </p>
        )}
        {weather.status === "ok" && !forecast && !typical && (
          <p className={styles.muted}>No weather data for this day.</p>
        )}
      </div>
    </div>
  );
}

// the line about the kind of day: a public holiday (with its name), a leave day, a weekend or a work day
function DayStatus({ day, isLeave }) {
  if (day.type === "holiday") {
    return (
      <p className={styles.status}>
        <span className={`${styles.dot} ${styles.holiday}`} />
        <span>
          <strong>{day.name}</strong>
          <br />
          Public holiday
        </span>
      </p>
    );
  }
  if (isLeave) {
    return (
      <p className={styles.status}>
        <span className={`${styles.dot} ${styles.leave}`} />
        <span>
          <strong>Suggested leave day</strong>
          <br />
          Takes you into a longer getaway
        </span>
      </p>
    );
  }
  if (day.type === "weekend") {
    return (
      <p className={styles.status}>
        <span className={`${styles.dot} ${styles.weekend}`} />
        <span>Weekend</span>
      </p>
    );
  }
  return (
    <p className={styles.status}>
      <span className={`${styles.dot} ${styles.work}`} />
      <span>Working day</span>
    </p>
  );
}
