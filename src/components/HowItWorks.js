import styles from "./HowItWorks.module.css";

// the icons are drawn with simple SVG shapes (they inherit the text colour)
const svgProps = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const STEPS = [
  {
    title: "1. Find",
    text: "Pick a country, year and your leave days. We find the getaways that give you the most days off.",
    color: "pink",
    icon: (
      <svg {...svgProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
    ),
  },
  {
    title: "2. Plan",
    text: "Set a daily budget in your currency and keep track of what you spend.",
    color: "lime",
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M7 15h4" />
      </svg>
    ),
  },
  {
    title: "3. Save",
    text: "Add it to your calendar as .ics or send a share link to friends.",
    color: "violet",
    icon: (
      <svg {...svgProps}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works">
      <h2 id="how-it-works">How it works</h2>
      <ol className={styles.steps}>
        {STEPS.map((step) => (
          <li key={step.title} className={styles.step}>
            <span className={`${styles.icon} ${styles[step.color]}`}>{step.icon}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
