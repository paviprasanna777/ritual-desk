# RitualDesk API

## First-time setup after cloning (Windows PowerShell)

Run the following commands from the repository root (the folder containing
`README.md`):

```powershell
npm --prefix api install --legacy-peer-deps
Copy-Item api\.env.example api\.env
notepad api\.env
```

In `api/.env`, set `SEED_USER` and `SEED_PASSWORD` to the credentials you will
use to log in. Replace the example `JWT_SECRET` with a private, random secret
of at least 32 characters. Generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value after `JWT_SECRET=` in `api/.env`, save, and close
Notepad. Do not share or commit this file.

Create the SQLite file and schema, then seed the login user and initial homam
types:

```powershell
npm --prefix api run migrate
npm --prefix api run seed
```

The default database file is `database/ritual-desk.sqlite` in the repository
root. `DB_PATH` can be changed in `api/.env`; relative paths are resolved from
the repository root. Open that `.sqlite` file in DBeaver using a SQLite
connection. See the [repository setup guide](../README.md#open-the-database-in-dbeaver)
for the DBeaver steps.

## Run the API

From the repository root:

```powershell
npm --prefix api run dev
```

The API listens on `http://localhost:3000` by default. Open
`http://localhost:3000/health` to check that it is running. Stop it with
`Ctrl+C`.

Alternatively, change directory into `api` and omit the `--prefix api` option:

```powershell
Set-Location api
npm run migrate
npm run seed
npm run dev
```

## Environment variables

The API loads and validates `api/.env` at startup. Copy `.env.example` to `.env`
before running it.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port |
| `DB_PATH` | `database/ritual-desk.sqlite` | SQLite database path; `:memory:` is supported |
| `SEED_USER` | unset | Username inserted by `npm run seed` |
| `SEED_PASSWORD` | unset | Password hashed by `npm run seed` |
| `JWT_SECRET` | required | Private signing key, at least 32 characters |
| `JWT_EXPIRES_IN` | `30d` | Token lifetime, using seconds, minutes, hours, or days (for example `12h`) |
| `BACKUP_DIR` | `api/backups` | Directory used by the backup script |

## Scripts

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm --prefix api run dev` | Start in TypeScript watch mode |
| `npm --prefix api run build` | Compile the strict TypeScript project |
| `npm --prefix api start` | Start the compiled API (build first) |
| `npm --prefix api run migrate` | Apply pending SQL migrations |
| `npm --prefix api run seed` | Insert the configured user and initial homam types |
| `npm --prefix api test` | Run API tests against in-memory SQLite |
| `npm --prefix api run backup` | Write `api/backups/ritualdesk-YYYY-MM-DD.db` |

`GET /backup` downloads a temporary consistent SQLite copy and removes the
temporary file after the response.

## Endpoints

All routes require `Authorization: Bearer <token>` except `GET /health` and
`POST /auth/login`.

| Method and path | Purpose |
| --- | --- |
| `GET /health` | Database and API health |
| `POST /auth/login`, `GET /auth/me` | Login and current user |
| `GET/POST /homams`, `PUT/DELETE /homams/:id` | Homam type management |
| `GET/POST /devotees`, `GET/PUT/DELETE /devotees/:id` | Devotee management |
| `GET/POST /bookings`, `GET/PUT /bookings/:id` | Booking list, detail, create, and edit |
| `POST /bookings/:id/payments` | Add an advance, part, final, or refund payment |
| `POST /bookings/:id/complete`, `/bookings/:id/cancel` | Complete or cancel a booking |
| `GET/POST /rituals`, `GET/PUT/DELETE /rituals/:id` | Ritual CRUD |
| `POST /rituals/:id/log`, `DELETE /rituals/:id/log/:date` | Mark/undo a ritual occurrence |
| `GET /schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` | Combined bookings and ritual occurrences, up to 62 days |
| `GET/POST /reminders`, `GET/PUT/DELETE /reminders/:id` | Reminder CRUD |
| `GET /reminders?date=YYYY-MM-DD` | Reminders for a calendar date |
| `GET /dashboard/summary` | Today, upcoming bookings, reminders, and outstanding balances |
| `GET /history?month=YYYY-MM` | Completed and cancelled bookings with monthly totals |
| `GET /reports/payments?month=YYYY-MM` | Charges and net collections for bookings scheduled in the month |
| `GET /backup` | Download a temporary consistent SQLite database backup |

Booking list filters are `status`, inclusive `from`/`to`, `devoteeId`, and
`balanceDue=true`. Creation accepts `force=true` to permit a schedule clash;
without `scheduledAt`, a booking is stored as `booked`. Cancellation refunds use
payment mode `other`, since the cancel request does not include a refund mode.
Scheduled bookings receive managed day-before (18:00) and same-day (06:00)
reminders, replaced on reschedule and removed on cancellation or completion.
