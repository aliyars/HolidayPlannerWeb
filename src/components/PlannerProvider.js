"use client";

import { createContext, useContext, useState } from "react";

// Shared choices (country, year, leave days) so the header, the pages and
// the "Plan this trip" button all see the same values.
const PlannerContext = createContext(null);

export function PlannerProvider({ children }) {
  const [country, setCountry] = useState({ code: "KR", name: "South Korea" });
  const [year, setYear] = useState(2026);
  const [leaveDays, setLeaveDays] = useState(2);
  const [selectedBreak, setSelectedBreak] = useState(null);

  const value = {
    country,
    setCountry,
    year,
    setYear,
    leaveDays,
    setLeaveDays,
    selectedBreak,
    setSelectedBreak,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  return useContext(PlannerContext);
}
