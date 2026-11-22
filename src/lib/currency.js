// Frankfurter API (free, no key): https://api.frankfurter.dev
const BASE = "https://api.frankfurter.dev/v1";

// { USD: "United States Dollar", JPY: "Japanese Yen", ... }
export async function getCurrencies() {
  const res = await fetch(`${BASE}/currencies`);
  if (!res.ok) throw new Error("Could not load currencies");
  return res.json();
}

// How many `to` you get for 1 `from`
export async function getRate(from, to) {
  if (from === to) return 1;
  const res = await fetch(`${BASE}/latest?base=${from}&symbols=${to}`);
  if (!res.ok) throw new Error("Could not load the exchange rate");
  const data = await res.json();
  return data.rates[to];
}
