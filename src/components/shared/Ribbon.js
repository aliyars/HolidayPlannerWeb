import { addDays, weekday, dayOfMonth, WEEKDAYS_SHORT } from "@/lib/breaks";
import styles from "./Ribbon.module.css";

// One tile per day of a break: [{ date, kind }] where kind is
// "holiday", "leave" or "weekend".
// around: also show one normal (dashed) day before and after the break.
// compact: smaller tiles, used inside cards.
export default function Ribbon({ days, around = false, compact = false }) {
  const tiles = around
    ? [
        { date: addDays(days[0].date, -1), kind: "normal" },
        ...days,
        { date: addDays(days[days.length - 1].date, 1), kind: "normal" },
      ]
    : days;

  return (
    <div className={`${styles.ribbon} ${compact ? styles.compact : ""}`}>
      {tiles.map((t) => (
        <div key={t.date} className={`${styles.day} ${styles[t.kind]}`}>
          <span>{WEEKDAYS_SHORT[weekday(t.date)]}</span>
          <strong>{dayOfMonth(t.date)}</strong>
        </div>
      ))}
    </div>
  );
}
