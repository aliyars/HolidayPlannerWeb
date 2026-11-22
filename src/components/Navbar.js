"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/app/icons/logo.svg";
import { usePlanner } from "./PlannerProvider";
import styles from "./Navbar.module.css";

const TABS = [
  { href: "/", label: "Find breaks" },
  { href: "/calendar", label: "Year calendar" },
  { href: "/plan", label: "Plan trip" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { country, year } = usePlanner();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <Image src={logo} alt="" width={40} height={40} priority />
        <span>Holiday Planner</span>
      </Link>

      <nav className={styles.pill} aria-label="Main">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.chip}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        {country.name} · {year}
      </div>
    </header>
  );
}
