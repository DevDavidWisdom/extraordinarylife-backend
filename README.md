# Extraordinary Life Backend

Express + PostgreSQL API for the Extraordinary Life co-working booking app.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

The API runs at **http://localhost:4000**. Postgres is exposed on port **5433** for local tools.

## Local development (without Docker)

1. Start Postgres (or use `docker compose up db`).
2. Set `DATABASE_URL` in `.env` (e.g. `postgres://extraordinary:extraordinary@localhost:5433/extraordinarylife`).
3. Run migrations and start the server:

```bash
npm install
npm run db:migrate
npm run dev
```

## Frontend

Point the frontend at the API (default `http://localhost:4000`):

```html
<script>window.EL_API_URL = 'http://localhost:4000';</script>
```

Serve the frontend from `http://localhost:3456` (included in `CORS_ORIGIN`).

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/auth/register` | — | Create member account |
| POST | `/api/auth/login` | — | Login (member or admin) |
| GET | `/api/me` | Bearer | Current user |
| GET | `/api/bookings` | Bearer | List bookings |
| GET | `/api/bookings/dates` | Bearer | Bookable dates |
| GET | `/api/bookings/availability?date=` | Bearer | Seat statuses for a date |
| POST | `/api/bookings` | Bearer | Create booking |
| GET | `/api/bookings/lookup?barcodeRef=` | Bearer | Lookup by barcode |
| PATCH | `/api/bookings/:id/check-in` | Admin | Mark checked in |
| GET | `/api/maintenance` | Bearer | Maintenance seat IDs |
| PUT | `/api/maintenance` | Admin | Set maintenance seats |
| GET | `/api/admin/metrics` | Admin | Today's dashboard metrics |
| GET | `/api/admin/members` | Admin | Registered members |
| GET | `/api/admin/june-quota` | Admin | June 2026 quota usage |

## Admin login

Configured via environment variables (not stored in the database):

- Email: `ADMIN_EMAIL` (default `admin@extraordinarylife.ng`)
- Password: `ADMIN_PASSWORD` (default `admin123`)
