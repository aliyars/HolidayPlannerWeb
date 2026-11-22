# Holiday & Long-Weekend Planner

Individual project for Web Programming (CAU, 2026). Next.js (App Router, JavaScript, `src/`), plain CSS, no Tailwind.

## What the app does

User picks a country, a year and how many leave days they have. The app fetches public holidays, finds the best breaks (most days off per leave day), shows the whole year on a calendar, and helps plan the trip (budget, currency, export).

## Tabs / routes

- `/` Find getaways: form (country, year, leave days) + list of best breaks as day-by-day ribbons
- `/calendar` Year calendar: 12 months, holidays per month chart
- `/plan` Plan trip: budget, currency conversion, budget check, export .ics, share link

## Levels (build in this order, don't skip ahead)

1. Static month calendar (HTML table)
2. Responsive year calendar + break ribbon (CSS Grid)
3. Fetch holidays from the API (fetch)
4. Suggest the best leave days (algorithm)
5. Pick 2 extras: .ics export, share link (country/year/leave days in the URL)

## APIs (all free, no API key)

- Nager.Date: `GET https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}`, `GET /api/v3/AvailableCountries`
- Frankfurter: currency conversion
- Open-Meteo: weather (optional)
- World Bank: price level (PA.NUS.PPP / PA.NUS.FCRF) for budget check (optional)

## Design (mockup option B)

- Colors are CSS variables in `globals.css`: violet #5A4EFF (buttons, active tab, hero), pink #EEA0FF (public holiday), lime #E2F4A6 (leave day), #ECECEC (weekend), dark #2F2F2F (text), #F5F5F5 (background)
- Fonts: Poppins for headings, Inter for body (next/font)
- Rounded corners (~22px cards, 12px inputs), soft shadows, pill-shaped tabs
- Mockup screenshots are in `docs/`

## Rules

- Keep code simple and readable. I need to be able to explain every part to my lecturer.
- One feature at a time. Don't add features I didn't ask for.
- A two-country mode (e.g. Korea + Indonesia) will be added later. Don't hardcode one country: functions take `countryCode` as a parameter, and holiday objects keep their country, e.g. `{ date, name, country }`.
- Use real `<button>`, `<label>` + `<input>` for forms. Make pages work on phone width too.
