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

// Which currency a destination uses, so "Show in" can follow the destination.
// Frankfurter only has rates for these currencies, so only the countries that use one
// of them are listed. Any other country gets "" (no exchange rate available).
const COUNTRIES_BY_CURRENCY = {
  AUD: ["AU"],
  BRL: ["BR"],
  CAD: ["CA"],
  CHF: ["CH", "LI"],
  CNY: ["CN"],
  CZK: ["CZ"],
  DKK: ["DK", "GL", "FO"],
  EUR: ["AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "AD", "MC", "SM", "VA", "ME", "XK"],
  GBP: ["GB", "GI", "IM", "JE", "GG"],
  HKD: ["HK"],
  HUF: ["HU"],
  IDR: ["ID"],
  ILS: ["IL"],
  INR: ["IN"],
  ISK: ["IS"],
  JPY: ["JP"],
  KRW: ["KR"],
  MXN: ["MX"],
  MYR: ["MY"],
  NOK: ["NO", "SJ"],
  NZD: ["NZ"],
  PHP: ["PH"],
  PLN: ["PL"],
  RON: ["RO"],
  SEK: ["SE"],
  SGD: ["SG"],
  THB: ["TH"],
  TRY: ["TR"],
  USD: ["US", "PR", "GU", "VI", "AS", "MP", "EC", "SV", "PA", "TL", "PW", "FM", "MH"],
  ZAR: ["ZA"],
};

// turn the table around: { JP: "JPY", ... }
const CURRENCY_OF_COUNTRY = {};
for (const [currency, countries] of Object.entries(COUNTRIES_BY_CURRENCY)) {
  for (const country of countries) CURRENCY_OF_COUNTRY[country] = currency;
}

// The currency of a country (for example "JP" -> "JPY"), or "" when we have no rate for it
export function currencyForCountry(countryCode) {
  return CURRENCY_OF_COUNTRY[countryCode] ?? "";
}
