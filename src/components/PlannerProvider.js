"use client";

import { createContext, useCallback, useContext, useState } from "react";

// Shared choices (country, second country, year, leave days) so the header,
// the pages and the "Plan this getaway" buttons all see the same values.
const PlannerContext = createContext(null);

export function PlannerProvider({ children }) {
  // The two countries live in ONE state, so they can never be the same country.
  const [countries, setCountries] = useState({
    first: { code: "KR", name: "South Korea" },
    second: null, // second country of the two-country mode (or null)
  });
  const [year, setYear] = useState(2026);
  const [leaveDays, setLeaveDays] = useState(2);

  const setCountry = useCallback((next) => {
    setCountries((prev) => ({
      first: next,
      // if the new first country was the second one, the old first country takes its place
      second: prev.second && prev.second.code === next.code ? prev.first : prev.second,
    }));
  }, []);

  const setCountry2 = useCallback((next) => {
    setCountries((prev) => ({
      ...prev,
      second: next && next.code === prev.first.code ? null : next,
    }));
  }, []);

  const value = {
    country: countries.first,
    setCountry,
    country2: countries.second,
    setCountry2,
    year,
    setYear,
    leaveDays,
    setLeaveDays,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  return useContext(PlannerContext);
}
