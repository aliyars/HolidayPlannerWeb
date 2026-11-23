"use client";

import { useEffect, useRef } from "react";
import styles from "./YearCalendar.module.css";

const HEIGHT = 190; // height of the chart in pixels
const TOP = 30; // room above the tallest bar for its number
const BOTTOM = 26; // room under the bars for the month names

// A rectangle with rounded corners (the path only; the caller fills it)
function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// The "Holidays per month" chart, drawn on a <canvas>.
//   counts - the number of public holidays of each month (12 numbers)
//   labels - the short month names ("Jan", "Feb", ...)
export default function HolidayChartCanvas({ counts, labels }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);

  // "counts" is a new array every time the page renders, so we compare what is in it
  // (as text). That way the chart is only drawn again when a number really changes.
  const countsKey = counts.join(",");

  useEffect(() => {
    const values = countsKey.split(",").map(Number);

    function draw() {
      const box = boxRef.current;
      const canvas = canvasRef.current;
      if (!box || !canvas) return;

      // A canvas is a grid of pixels, so it must have the real number of pixels of the
      // screen (devicePixelRatio), or the drawing is blurry on phones and retina screens.
      const width = box.clientWidth;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(HEIGHT * ratio);

      const ctx = canvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // from here on we draw in normal CSS pixels
      ctx.clearRect(0, 0, width, HEIGHT);

      // colours and font come from the page, so the chart always matches the rest of the app
      const css = getComputedStyle(document.documentElement);
      const pink = css.getPropertyValue("--pink").trim() || "#eea0ff";
      const grey = css.getPropertyValue("--weekend").trim() || "#ececec";
      const dark = css.getPropertyValue("--dark").trim() || "#2f2f2f";
      const font = getComputedStyle(document.body).fontFamily;

      const max = Math.max(...values, 1);
      const columnWidth = width / values.length;
      const barWidth = Math.min(columnWidth - 8, 48);
      const base = HEIGHT - BOTTOM; // the line the bars stand on
      const tallest = base - TOP; // height of the tallest bar
      const small = columnWidth < 30; // on narrow screens the text is a bit smaller

      ctx.textAlign = "center";
      values.forEach((count, i) => {
        const centre = columnWidth * i + columnWidth / 2;
        const barHeight = count === 0 ? 8 : (count / max) * tallest; // 0 holidays: a small grey bar

        ctx.fillStyle = count === 0 ? grey : pink;
        roundedRect(ctx, centre - barWidth / 2, base - barHeight, barWidth, barHeight, 10);
        ctx.fill();

        ctx.fillStyle = dark;
        ctx.font = `500 ${small ? 12 : 14}px ${font}`;
        ctx.fillText(String(count), centre, base - barHeight - 8);

        ctx.fillStyle = "#666";
        ctx.font = `${small ? 11 : 13}px ${font}`;
        ctx.fillText(labels[i], centre, HEIGHT - 6);
      });
    }

    draw();

    // draw again when the width changes (a phone turned around, a window resized) ...
    const observer = new ResizeObserver(draw);
    observer.observe(boxRef.current);
    // ... and when the fonts are loaded, so the text uses the right font
    document.fonts?.ready.then(draw);

    return () => observer.disconnect();
  }, [countsKey, labels]);

  // a canvas cannot be read by a screen reader, so the numbers are also given as text
  const description = `Holidays per month: ${labels.map((label, i) => `${label} ${counts[i]}`).join(", ")}`;

  return (
    <div ref={boxRef} className={styles.chartBox}>
      <canvas ref={canvasRef} className={styles.chartCanvas} role="img" aria-label={description}>
        {description}
      </canvas>
    </div>
  );
}
