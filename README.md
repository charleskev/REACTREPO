# AgriSystem (XianFire)

## Run the application

This project runs through the XianFire Express application at the root folder.

1. Start MySQL and make sure the `myApp` database is available.
2. Run `npm install` once if dependencies are not installed.
3. Run `npm run xian`.
4. Open `http://localhost:3000`.

You can register a farmer account at `/register`, then log in at `/login`. A successful login opens `/dashboard`.

The separate React/PostgreSQL prototype in `client/` and `server/` remains available for reference; it is not required for `npm run xian`.

---

AgriSystem is a mobile-first agricultural damage-reporting system for a Municipal Agriculture Office.

## Active application structure

```text
client/                         React + Tailwind user interface
  src/components/               Navigation, dashboard cards, status badges, map
  src/pages/                    Farmer and MAO/Admin screens
  src/services/api.js           Single API client
server/                         Express + PostgreSQL API
  src/controllers/              Feature request handlers
  src/models/                   Database query modules
  src/routes/                   Protected API endpoints
  src/middleware/               JWT, roles, file uploads
  src/services/                 Gemini and OpenWeather integration points
```

## React pages

- Farmer: Overview, Profile & Land, Submit Damage Report, My Reports, Notifications
- MAO Staff / Technician: Operations Dashboard and Report Review
- LGU Admin: Farmer Registration Approval and User Management
- Staff: Send benefit or alert notifications

## Run locally

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. In `server`, run `npm install` then `npm run migrate`.
3. In `client`, run `npm install`.
4. From this root folder, run `npm run agri:dev`.

Open `http://localhost:5173`. The API is available at `http://localhost:4000`.

The older XianFire folders at the root remain intact for reference, but `client/` and `server/` are the active AgriSystem application.
