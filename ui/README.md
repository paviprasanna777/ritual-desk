# RitualDesk UI

## First-time setup after cloning (Windows PowerShell)

Install the UI workspace dependencies from the repository root:

```powershell
npm install
```

Start the Angular/Ionic development server from the repository root:

```powershell
npm run ui:start
```

Open the local URL printed in the terminal, normally `http://localhost:4200`.
Stop the development server with `Ctrl+C`.

Sign in with the user configured by `SEED_USER`/`SEED_PASSWORD` in the API's
`api/.env`. The dashboard loads the summary from `GET /dashboard/summary`.
The UI stores the authentication token using Capacitor Preferences and sends it
as a bearer token with API requests.

The development API URL is set in `src/environments/environment.ts` and defaults
to `http://localhost:3000`. For a Capacitor app on a phone, `localhost` refers
to the phone, not your development computer: change `apiUrl` to an API address
reachable from that device (for example, your computer's LAN IP during local
testing, or your deployed HTTPS API URL), and rebuild/sync the mobile app.

## Build, test, and lint

Run these commands from the repository root:

```powershell
npm run ui:build
npm run ui:test
npm run ui:lint
```

You can also run the equivalent commands from this `ui` directory using
`npm run start`, `npm run build`, `npm run test`, or `npm run lint`.

## API and database

The API and SQLite database have their own setup; follow
[`api/README.md`](../api/README.md) or the root
[clone and run guide](../README.md#clone-and-run-on-windows).

The UI connects to the API for dashboard data; it does not connect directly to
the SQLite file. Keep the API running and ensure it is reachable from the browser
or device.
