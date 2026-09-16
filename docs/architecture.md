# AgriSystem foundation

AgriSystem is split into a phone-first React client and an Express API. PostgreSQL is the system of record. Uploaded ownership documents and report photographs are stored locally in `server/uploads` during development and can later be redirected to an S3-compatible service.

## Folder layout

```text
client/                         React + Vite + Tailwind interface
  src/
    features/                   Farmer, staff, technician, and admin screens
    components/                 Shared mobile-first UI and map components
    services/                   API client, browser location, upload helpers
server/                         Express API
  src/
    controllers/                HTTP handlers
    middleware/                 JWT authentication and RBAC guards
    routes/                     Feature endpoints
    services/                   Gemini vision, weather, notifications
  db/migrations/                Versioned PostgreSQL schema
  uploads/                      Development-only local uploads
docs/                           Architecture and implementation notes
```

## Data relationships

```text
User (farmer) 1—1 FarmerProfile 1—* Land 1—* DamageReport 1—* ReportPhoto
                                  └——* WeatherSnapshot
FarmerProfile 1—* Notification
User (staff / technician / admin) reviews profiles and damage reports
```

## Pages and API modules

| Area | Pages | Server module |
| --- | --- | --- |
| Farmer | Dashboard, Profile & Land, Damage Report, Notifications | `farmerRoutes`, `reportRoutes`, `notificationRoutes` |
| MAO staff / technician | Operations dashboard, Review Reports | `dashboardRoutes`, `reportRoutes` |
| Admin | Farmer Registrations, User Management endpoint | `adminRoutes` |

All protected routes use a Bearer JWT. The role gate is centralized in `server/src/middleware/auth.js`.

## Status rules

- A farmer starts as `pending`; only `approved` farmers with registered land may submit a report.
- Reports start as `pending`; staff or technicians can mark them `verified` or `rejected`.
- AI findings remain separate from human-confirmed plant and damage values to preserve accuracy data.
