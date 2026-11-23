# Holiday Planner

Turn a few leave days into a real holiday.

You choose a country, a year and how many leave days you have. The app gets the public holidays of that
country, adds the weekends, and finds the **getaways**: runs of days off in a row that use as few leave
days as possible. You can then look at the whole year, plan a trip (budget, expenses, weather) and add it
to your calendar.

Individual project for Web Programming (Chung-Ang University, 2026).

## Live demo

**<https://holiday-planner-webprog.vercel.app>**

It runs on [Vercel](https://vercel.com) and works on a phone too. Nothing to install: open the link, choose a
country and press **Find getaways**. (To run the code on your own computer, see the next part.)

## Run it

You need **Node.js 20.9 or newer** (it was built with Node 22) and an internet connection, because the
data comes from open APIs.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Command         | What it does                                      |
| --------------- | ------------------------------------------------- |
| `npm run dev`   | development server with hot reload                |
| `npm run build` | production build                                  |
| `npm start`     | run the production build (after `npm run build`) |
| `npm run lint`  | check the code with ESLint                        |

No API keys or environment variables are needed.

## What the app does

The app has three pages.

**Find getaways (`/`)**
- Search by country, year and leave days. Optionally add a **second country**: the two countries are
  searched separately and shown as two lists.
- **Use my location** fills in the country where you are (the browser asks for permission first).
- Two ways to rank the results: **Best value** (most days off per leave day) and **Use my leave days**
  (the longest holidays that use all your leave days).
- Every card shows the dates, the name of the public holiday, a day-by-day ribbon (public holiday, leave
  day, weekend) and a button to plan it. The best pick is always first.
- **My holidays**: add holidays the API does not have (one day or a range). A warning is shown when a
  country has few holidays in the API.
- The search is in the address bar (`/?country=KR&year=2026&leave=2`), so it can be shared.

**Year calendar (`/calendar`)**
- All 12 months, with public holidays and the suggested leave days.
- A chart of holidays per month (drawn on a `<canvas>`) and the months without holidays.
- Hover or tap a day to see the name of the holiday and the weather (the forecast for the next 16 days,
  or what the weather is usually like on that date).
- With two countries, a switch chooses which country is shown.

**Plan trip (`/plan`)**
- Open with a getaway (`/plan?country=KR&start=2026-02-13&end=2026-02-18`): a daily budget with currency
  conversion, expenses (add, edit, delete, categories), the weather at the destination, an `.ics` file for
  your calendar (the getaway, plus a reminder for every leave day) and a share link.
- Without a getaway: **Your trips**, the getaways you opened before, with the progress of their budget.

## How the search works

The search is in `src/lib/breaks.js`. In short:

1. Every day of the year gets one type: public holiday, weekend or work day.
2. Every possible start day is tried, and the end day is stretched day by day. A work day inside the
   stretch is a leave day. Stretching stops when the leave days pass the limit.
3. A stretch is kept only if it follows the rules: at least 3 days off, at least one public holiday, at
   least one leave day, and it is "full" (the days before and after it are work days).
4. The results are sorted (by days off per leave day, or by length), and a getaway is kept only if its
   dates do not overlap a better one. At most 5 getaways are shown.

## How it is built

- **Next.js** (App Router) with **React** and plain **JavaScript**; **CSS Modules**, no CSS framework.
- **Client and server.** The browser asks our own server for data, and the server asks the open APIs:

  | Route                  | What it does                                                                         |
  | ---------------------- | ------------------------------------------------------------------------------------ |
  | `GET /api/holidays`    | the public holidays of a country and year (cached in memory for a day)               |
  | `POST /api/getaways`   | runs the search and sends back the getaways (the user's own holidays are sent along) |

- **Open APIs** (all free, no key):
  [Nager.Date](https://date.nager.at) (countries and public holidays),
  [Frankfurter](https://frankfurter.dev) (exchange rates),
  [Open-Meteo](https://open-meteo.com) (forecast and past weather),
  [World Bank](https://api.worldbank.org) (capital city and its coordinates),
  [BigDataCloud](https://www.bigdatacloud.com) (country at the coordinates of "Use my location").
- **Data of the user** stays in the browser (`localStorage`):

  | Key                                          | Content                               |
  | -------------------------------------------- | ------------------------------------- |
  | `holiday-planner:trips`                      | the saved trips                       |
  | `holiday-planner:expenses:<country>:<start>:<end>` | expenses and categories of one trip |
  | `holiday-planner:custom-holidays`            | the holidays the user added           |

## Project structure

```
src/
  app/                 pages and routes (/, /calendar, /plan, /api/...), global CSS, images
  components/
    layout/            Navbar, PlannerProvider (the choices shared by all pages)
    find/              FindGetaways, GetawayList, HowItWorks, MyHolidays
    calendar/          YearCalendar, DayTooltip, HolidayChartCanvas
    plan/              PlanTrip, PlanEmpty, TripWeather, Expenses, CategoryManager
    shared/            Ribbon (the day-by-day strip)
  lib/                 the search, API calls, trips, currencies, weather, location
    server/            code that only runs on the server
docs/                  the design mockups
```

## Course checklist

- HTML + CSS: yes
- JavaScript: yes
- Location based: yes ("Use my location"; the weather also uses the coordinates of a capital city)
- Canvas: yes (the "Holidays per month" chart)
- Open API: yes (see above)
- Server / Client: yes (`/api/holidays` and `/api/getaways`)
- Database: no. The data of the user is saved in `localStorage`.

## Good to know

- Weekends are Saturday and Sunday in every country.
- Only holidays that apply to the whole country are used. Some countries have few of them in the API
  (for example Indonesia has no religious holidays); use **My holidays** to add what is missing.
- The destination of a trip is a country. The weather is for its capital city.
- Exchange rates are reference rates (updated once per working day) and exist for 31 currencies.
- Trips, expenses and own holidays belong to one browser; they are not shared between devices.

## Credits

- Photos on the trip cards: see `src/app/images/trips/CREDITS.txt`.
