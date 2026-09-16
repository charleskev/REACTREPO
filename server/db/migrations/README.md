# AgriSystem database migrations

This folder contains PostgreSQL migrations in execution order. The first migration creates the full foundation for users, farmer registration, land records, damage reports and photos, notifications, and cached weather data.

The schema uses UUID primary keys. Enable `pgcrypto` before applying the first migration:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Do not run the legacy project-level `npm run migrate`: it targets the old MySQL/XianFire sample database and drops tables. AgriSystem will use `server` migrations instead.
