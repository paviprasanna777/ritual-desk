# RitualDesk

RitualDesk — Tradition, Organized. Manage poojas, rituals, schedules, and sacred
activities.

## Clone and run on Windows

### 1. Install prerequisites

Install Git, Node.js 24 LTS (including npm), and DBeaver Community Edition. Open
PowerShell in the folder where you want the project and clone it:

```powershell
git clone https://github.com/paviprasanna777/ritual-desk.git
cd ritual-desk
```

### 2. Install dependencies

From the repository root:

```powershell
npm install
npm --prefix api install --legacy-peer-deps
```

The first command installs the Angular/Ionic UI workspace dependencies; the
second installs the API dependencies, including SQLite support.

### 3. Configure the API

Create the API's local environment file:

```powershell
Copy-Item api\.env.example api\.env
notepad api\.env
```

In `api/.env`, replace the sample `JWT_SECRET` with a private random value. To
generate one, run this in PowerShell and paste its output into the file:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set `SEED_USER` and `SEED_PASSWORD` to the login credentials you want. Keep the
secret and password private; do not commit `api/.env`.

By default, the API uses `database/ritual-desk.sqlite`, relative to the
repository root. Set `DB_PATH` in `api/.env` if you want a different database
file.

### 4. Create the database, tables, and initial data

From the repository root:

```powershell
npm --prefix api run migrate
npm --prefix api run seed
```

Migration creates the SQLite database and tables. Seeding adds the user and
initial homam types. These commands use the settings in `api/.env`.

### 5. Start the API

In a terminal at the repository root:

```powershell
npm --prefix api run dev
```

Leave this terminal running. The API listens at `http://localhost:3000`. Check
that it is available by opening `http://localhost:3000/health`.

### 6. Start the UI

Open a second terminal at the repository root:

```powershell
npm run ui:start
```

Open the local URL printed by Angular, usually `http://localhost:4200`.

The UI opens directly on the dashboard. Sign in with `SEED_USER` and
`SEED_PASSWORD` from `api/.env`; the dashboard loads its data from the API.
For a Capacitor app on a phone, configure `apiUrl` in
`ui/src/environments/environment.ts` to an API URL reachable from the device.
On a phone, `localhost` means the phone itself, not your development computer.
The UI talks to the API; it should not connect directly to the SQLite file.

## Open the database in DBeaver

1. Run the migration in step 4 so that the database file exists.
2. In DBeaver, choose **Database → New Database Connection**, select **SQLite**,
   and install the driver if DBeaver prompts you.
3. Browse to the database file:

   ```text
   <cloned-project-folder>\database\ritual-desk.sqlite
   ```

   For example: `C:\New folder\ritual-desk\database\ritual-desk.sqlite`.
4. Choose **Test Connection**, then **Finish**.
5. In **Database Navigator**, expand the connection and **Tables**. Right-click
   the connection and select **Refresh** if the tables are not shown.

The file is local SQLite, so there is no database server or separate DB
username/password. Connect to the `.sqlite` file itself, not any `-wal` or
`-shm` sidecar files.

## More documentation

- [API setup, configuration, scripts, and endpoint list](./api/README.md)
- [UI setup and scripts](./ui/README.md)
