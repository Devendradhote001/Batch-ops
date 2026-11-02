# BatchOps

Internal platform for a training vertical: track student batches, sessions, daily updates and events
across instructors, with read-only analytics for senior management.

| Role         | Who                    | Access                                                                       |
| ------------ | ---------------------- | ---------------------------------------------------------------------------- |
| `admin`      | Vertical lead          | Everything: users, batches, sessions, daily updates, events, analytics       |
| `instructor` | Co-instructors         | Assigned batches, own sessions (create/edit), events they lead, own stats    |
| `viewer`     | Senior manager         | Read-only dashboard, batches, sessions, daily updates, events and analytics  |

## Features

- **Dashboard** — today at a glance per role: sessions today, active batches with progress, events in the next
  7 days, today's daily update (with a "file it" prompt for the admin), recent updates and an activity feed.
- **Batches** — searchable/filterable grid with progress; detail page with syllabus checklist, session
  timeline, linked events and instructors. Admins create, edit, archive and tick off modules.
- **Sessions** — log from anywhere or from a batch; month calendar + day view; instructors log and edit only
  their own sessions on batches they teach.
- **Daily updates** — one end-of-day update per IST day (summary, highlights, blockers, next-day plan, batch
  notes, status), written alongside that day's sessions; a filterable feed for the manager.
- **Events** — workshops, hackathons, talks, assessments; month calendar and list views; lead + co-leads,
  linked batches, mark completed with outcome and participant count.
- **Analytics** — KPIs and eight charts (progress, sessions and attendance over time, instructor workload,
  session status, events by month and by leader, update consistency) over 7/30/90 days or a custom range,
  filterable by batch and instructor. Every chart also has a table view.
- **Admin** — create instructor/viewer accounts (no public signup), edit roles, reset passwords, deactivate.
- **Forgot password** — "Forgot password?" on the login page emails a single-use link (expires in 30 minutes)
  to set a new password. Without email configured, the request goes to the admin instead, who sets a temporary
  password from *Admin → Users*. Either way a request alone never changes a password.
- Light/dark mode, responsive down to phone width, keyboard-accessible dialogs.

## Stack

- **client/** — React 18, Vite, TypeScript, React Router 6, TanStack Query, React Hook Form + Zod,
  Tailwind CSS 4, Recharts, lucide-react, dayjs, sonner, Axios
- **server/** — Node.js, Express 5, TypeScript, MongoDB + Mongoose, Zod, JWT (httpOnly cookies), bcrypt,
  helmet, cors, express-rate-limit, morgan
- **shared/** — role/status enums and API types used by both apps

## Getting started

Prerequisites: Node.js 20.19+ and MongoDB 5+ (local or Atlas).

```bash
npm install
cp server/.env.example server/.env    # then set the JWT secrets and admin credentials
cp client/.env.example client/.env
npm run seed                          # creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                           # API on :4000, web app on :5173
```

Open http://localhost:5173 and sign in with the admin credentials from `server/.env`.

Then add your team from **Admin → Users**, create batches, and start logging sessions — the dashboard and
analytics fill in as you go.

### Scripts (run from the repo root)

| Script              | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | API (tsx watch) + Vite dev server                                   |
| `npm run seed`      | Creates the first admin account (safe to re-run)                    |
| `npm run reset-password` | Sets a new password for any account (asks for email + hidden password) |
| `npm run typecheck` | Type-checks every workspace                                         |
| `npm run build`     | Bundles the API (tsup) and builds the client (Vite)                 |
| `npm start`         | Runs the built API; in production it also serves the built client   |

### Environment

`server/.env` (validated at startup — the server exits with a clear message if something is wrong):

| Variable                 | Default                   | Notes                                                      |
| ------------------------ | ------------------------- | ---------------------------------------------------------- |
| `NODE_ENV`               | `development`             | `production` turns on secure cookies and client serving    |
| `PORT`                   | `4000`                    |                                                            |
| `MONGODB_URI`            | —                         | required                                                   |
| `CLIENT_ORIGIN`          | `http://localhost:5173`   | comma-separated origins allowed to call the API with cookies |
| `JWT_ACCESS_SECRET`      | —                         | required, ≥ 32 chars; `openssl rand -base64 48`            |
| `JWT_REFRESH_SECRET`     | —                         | required, ≥ 32 chars, different from the access secret     |
| `ACCESS_TOKEN_TTL_MIN`   | `15`                      |                                                            |
| `REFRESH_TOKEN_TTL_DAYS` | `7`                       |                                                            |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | used by `npm run seed`                             |
| `EMAIL_PROVIDER`         | —                         | `brevo` to email reset links, `log` to print them (dev); unset = admin handles resets |
| `BREVO_API_KEY`          | —                         | Brevo → SMTP & API → API keys (needed for `brevo`)          |
| `MAIL_FROM_EMAIL` / `MAIL_FROM_NAME` | — / `BatchOps` | sender; must be verified in Brevo → Senders                |
| `APP_URL`                | first `CLIENT_ORIGIN`     | public web-app URL used in emailed links                   |
| `SERVE_CLIENT`           | when a build exists       | serve `client/dist` from the API (`false` to turn off)     |

`client/.env`: `VITE_API_URL` (default `/api`). Only change it if the API lives on a different origin.

## Deployment

### Render + MongoDB Atlas (free tiers)

The repo includes a `render.yaml` blueprint: one web service that builds both apps and serves them from one
HTTPS URL. JWT secrets are generated by Render; the first admin is created automatically on first start from
`ADMIN_EMAIL` / `ADMIN_PASSWORD` (only while the database has no admin, so it's safe to leave set).

1. **Database (MongoDB Atlas):** create a free M0 cluster (Mumbai region is closest to IST users). Under
   *Database Access* add a database user; under *Network Access* allow `0.0.0.0/0` (Render's free tier has no
   fixed IPs). Copy the connection string and add the database name:
   `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/batchops?retryWrites=true&w=majority`
2. **Code:** push this repo to a (private) GitHub repository.
3. **Render:** *New → Blueprint*, pick the repository, then fill in `MONGODB_URI`, `ADMIN_NAME`, `ADMIN_EMAIL`
   and a strong `ADMIN_PASSWORD`. Apply — the first build takes a few minutes.
4. Open the `https://….onrender.com` URL, sign in as the admin, and add your team from *Admin → Users*.

Every push to the default branch redeploys. On the free plan the service sleeps after ~15 minutes without
traffic; the first request after that takes up to a minute while it wakes.

### Frontend on Vercel, API on Render

Live setup: `https://batch-ops-sigma.vercel.app` (frontend) → `https://batch-ops.onrender.com` (API).

`client/vercel.json` forwards `/api/*` to the Render service and serves `index.html` for every other path. The
browser only ever talks to the Vercel origin, so auth cookies stay first-party (Safari included) and no CORS or
`VITE_API_URL` change is needed. If the API moves, update the rewrite destination in `client/vercel.json`.
The Render service still serves the app on its own URL too.

### Any Node host

The simplest setup is one Node process serving both the API and the app from the same origin, which keeps the
auth cookies first-party:

```bash
npm ci
npm run build
NODE_ENV=production npm start         # with server/.env (or real env vars) set
npm run seed                          # once (or set ADMIN_* and the server creates it on first start)
```

The server serves `client/dist` (hashed assets cached for a year, `index.html` revalidated) and falls back to
the app shell for client-side routes; everything under `/api` stays JSON. Put it behind HTTPS (cookies are
`Secure` in production). If you host the client separately, set `CLIENT_ORIGIN` on the server and
`VITE_API_URL` on the client — note that cross-site cookies then need `SameSite=None`.

## Project structure

```
shared/src/            enums (roles, statuses) + API response types
server/src/
  config/              Zod-validated env, MongoDB connection
  middleware/          authenticate, authorize, validate, rate limits, error handler
  modules/<feature>/   model · schema (Zod) · service · controller · routes
                       (auth, users, batches, sessions, updates, events, activity, dashboard, analytics)
  utils/               ApiError, response envelope, pagination, IST day helpers, password hashing
  scripts/             seedAdmin (first admin account)
client/src/
  components/ui/       Button, Input, Select, Modal, Card, Badge, StatCard, DataTable, EmptyState,
                       PageHeader, ConfirmDialog, Skeleton, Pagination…
  components/layout/   AppShell, Sidebar (role-based nav), Topbar, UserMenu, ThemeToggle
  features/<feature>/  api hooks (TanStack Query), schemas, components, pages
  lib/                 Axios client, query client, IST day helpers, theme, URL-synced filters
  routes/              RequireAuth / RequireRole guards
```

## API

- Success: `{ success: true, data, message?, meta? }` — `meta` carries pagination on list endpoints.
- Failure: `{ success: false, error: { code, message, details? } }` with a matching HTTP status.
- Every body and query is validated with Zod; failures return `400 VALIDATION_ERROR` with per-field details.
- Admin-only endpoints live under `/api/admin/*`, behind `authenticate` + `authorize('admin')`.

| Area      | Endpoints                                                                                                       | Access                                   |
| --------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Auth      | `POST /api/auth/login` · `POST /forgot-password` · `POST /reset-password` · `POST /refresh` · `POST /logout` · `GET /me` · `PATCH /me/password` | public / signed in                       |
| Users     | `GET /api/users/options?roles=`                                                                                 | signed in                                |
|           | `GET/POST /api/admin/users` · `PATCH /:id` · `PATCH /:id/status` · `POST /:id/reset-password`                    | admin                                    |
| Batches   | `GET /api/batches?q&status&instructor&archived&page` · `GET /api/batches/:id` · `GET /api/batches/options`       | signed in (instructors: own)             |
|           | `POST /api/admin/batches` · `PUT /:id` · `PATCH /:id/archive` · `PATCH /:id/modules/:moduleId`                   | admin                                    |
| Sessions  | `GET /api/sessions?day&from&to&batch&instructor&status&type&page` · `GET /calendar?month=` · `GET /:id`         | signed in (instructors: own batches)     |
|           | `POST /api/sessions` · `PUT /:id` · `DELETE /:id`                                                               | admin: any · instructor: own, assigned   |
| Updates   | `GET /api/updates?from&to&status&page` · `GET /api/updates/:day`                                                | admin, viewer                            |
|           | `PUT /api/updates/:day` (upsert — one update per IST day)                                                       | admin                                    |
| Events    | `GET /api/events?from&to&type&status&batch&leader&sort&page` · `GET /:id`                                       | signed in (instructors: led/co-led)      |
|           | `POST /api/admin/events` · `PUT /:id` · `PATCH /:id/complete` · `DELETE /:id`                                   | admin                                    |
| Dashboard | `GET /api/dashboard`                                                                                            | signed in (role-aware)                   |
| Analytics | `GET /api/analytics/{kpis,batch-progress,sessions-over-time,instructor-workload,attendance-trend,session-status,events}` | signed in (instructors: own numbers) |
|           | `GET /api/analytics/update-consistency` — all take `from&to&batch&instructor`                                  | admin, viewer                            |

## Key decisions

- **Auth via httpOnly cookies.** A 15-minute access token and a 7-day refresh token, both httpOnly and
  `SameSite=Lax`; the refresh cookie is scoped to `/api/auth` and rotates on every use. The Axios client
  refreshes once on a 401 and retries, sharing one refresh across parallel requests. Failed logins are
  rate-limited.
- **Instant revocation.** Tokens carry the user's `tokenVersion`, and `authenticate` re-reads the user on every
  request, so deactivation, role changes and password changes apply on the next request. A password change or
  reset bumps `tokenVersion`, signing out every other device.
- **RBAC on the server.** The UI hides what a role can't use, but the API is the source of truth. The acting
  user's id and role always come from the token, never the request body.
- **IST days.** Instants are stored in UTC. Daily records (sessions, updates, events, batch dates) carry a
  `day` string (`YYYY-MM-DD` in Asia/Kolkata), which makes "what happened on this day" queries exact and
  index-friendly. The server decides what "today" is.
- **Session rules.** Instructors always log as themselves (any `instructor` in the body is ignored), only on
  batches they're assigned to, and can change only sessions they took. Admins can log for any instructor on
  the batch. No future dates, no archived batches, http(s)-only recording links.
- **Daily updates are keyed by day.** `PUT /api/updates/:day` creates or replaces the single update for that
  day (unique index). Past days can be back-filled; future days can't.
- **Events.** Instructors see events they lead or co-lead. Only admins create, edit, complete or delete; an
  event can't be completed before its day. Cancelling keeps a record; deleting removes it.
- **Analytics are aggregations.** Every number comes from a MongoDB pipeline over the filtered range (default
  last 30 days). Weekly series come back pivoted with empty weeks filled. Instructors' filters are forced to
  themselves on the server. Batch progress is cumulative and ignores the range.
- **Charts.** A validated colour-blind-safe categorical palette (light and dark steps) in fixed order; a batch or
  person keeps its colour regardless of filters. Status colours are reserved and always labelled. Every chart
  has a tooltip, a legend for 2+ series, and a table view. No dual-axis charts (workload toggles hours/sessions).
- **Activity log.** Mutations write a pre-rendered summary to `activities`, which feeds the dashboard without
  joins. Logging failures never fail the request.
- **Soft deletes where history matters.** Users are deactivated, batches archived. Sessions and events can be
  deleted (and batch progress recalculates); daily updates are edited, not deleted.
- **Performance.** Every page is code-split (the chart library only loads on Analytics) and framework code is in
  long-lived vendor chunks. List endpoints paginate; filters live in the URL so views can be shared.
- **Security headers.** Helmet's default Content-Security-Policy is kept strict (no inline scripts — the
  pre-paint theme script is a file).

## Troubleshooting

- **Reset emails don't arrive** — check the server log for `Password reset email … failed` (Brevo's reason is
  included). Common causes: the sender isn't verified in Brevo, a wrong `BREVO_API_KEY`, or the email is in spam.

- **Forgot the admin password** — passwords are stored as one-way hashes and can't be recovered. Run
  `npm run reset-password` from the repo root; it uses `MONGODB_URI` from `server/.env`, so point that at the
  database you want to change (local or Atlas). It signs the account out everywhere.

- **The server exits on start** — read the message: it lists each invalid env variable.
- **Login works but you're immediately signed out** — the API and app must share an origin (use the Vite dev
  server on :5173, or the production server serving the client). Over plain HTTP in production, browsers drop
  `Secure` cookies except on `localhost`.
- **"BatchOps was updated" after a deploy** — an open tab asked for an old code chunk; reload.
