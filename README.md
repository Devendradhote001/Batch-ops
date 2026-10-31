# BatchOps

Internal platform for a training vertical: track student batches, sessions, daily updates and events
across instructors, with read-only analytics for senior management.

| Role         | Access                                                                      |
| ------------ | --------------------------------------------------------------------------- |
| `admin`      | Everything — users, batches, sessions, daily updates, events, analytics     |
| `instructor` | Assigned batches, own sessions (create/edit), events they lead, own stats   |
| `viewer`     | Read-only dashboard, batches, sessions, daily updates, events and analytics |

## Stack

- **client/** — React 18, Vite, TypeScript, React Router 6, TanStack Query, React Hook Form + Zod,
  Tailwind CSS 4, Recharts, lucide-react, dayjs, sonner, Axios
- **server/** — Node.js, Express 5, TypeScript, MongoDB + Mongoose, Zod, JWT (httpOnly cookies), bcrypt,
  helmet, cors, express-rate-limit, morgan
- **shared/** — role/status enums and API types used by both apps

## Getting started

Prerequisites: Node.js 20.19+ and MongoDB (local or Atlas).

```bash
npm install
cp server/.env.example server/.env    # then set the JWT secrets and admin credentials
cp client/.env.example client/.env
npm run seed                          # creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:demo                     # optional: realistic demo data (WIPES all data except the admin)
npm run dev                           # API on :4000, web app on :5173
```

`seed:demo` builds a vertical relative to today: 3 instructors and a viewer (password `Demo@1234`, or
`DEMO_PASSWORD`), 4 batches, every scheduled session since each batch started, ~30 days of daily updates,
events either side of today and an activity feed. It refuses to run with `NODE_ENV=production`.

Open http://localhost:5173 and sign in with the admin credentials from `server/.env`.
Generate JWT secrets with `openssl rand -base64 48`.

### Scripts (run from the repo root)

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Runs the API (tsx watch) and the Vite dev server     |
| `npm run seed`      | Creates the first admin account (safe to re-run)     |
| `npm run seed:demo` | Resets the database to demo data (keeps the admin)   |
| `npm run typecheck` | Type-checks every workspace                          |
| `npm run build`     | Bundles the API (tsup) and builds the client (Vite)  |
| `npm start`         | Runs the built API from `server/dist`                |

## Project structure

```
shared/src/            enums (roles, statuses) + API response types
server/src/
  config/              Zod-validated env, MongoDB connection
  middleware/          authenticate, authorize, validate, rate limits, error handler
  modules/<feature>/   model · schema (Zod) · service · controller · routes
  utils/               ApiError, response envelope, pagination, IST day helpers, password hashing
  scripts/             seed scripts
client/src/
  components/ui/       Button, Input, Field, Card, Badge, Skeleton, EmptyState, PageHeader, Avatar…
  components/layout/   AppShell, Sidebar (role-based nav), Topbar, UserMenu, ThemeToggle
  features/<feature>/  api hooks (TanStack Query), schemas, components, pages
  lib/                 Axios client, query client, IST day helpers, theme
  routes/              RequireAuth / RequireRole guards
```

## API conventions

- Success: `{ success: true, data, message?, meta? }` — `meta` carries pagination on list endpoints.
- Failure: `{ success: false, error: { code, message, details? } }` with a matching HTTP status.
- Every body/query is validated with Zod; validation failures return `400 VALIDATION_ERROR`.
- Admin-only endpoints live under `/api/admin/*`, which requires `authenticate` + `authorize('admin')`.

| Area    | Endpoints                                                                                                         | Access                          |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Auth    | `POST /api/auth/login` · `POST /refresh` · `POST /logout` · `GET /me` · `PATCH /me/password`                       | public / signed in              |
| Users   | `GET /api/users/options?roles=`                                                                                   | signed in                       |
|         | `GET/POST /api/admin/users` · `PATCH /:id` · `PATCH /:id/status` · `POST /:id/reset-password`                      | admin                           |
| Batches | `GET /api/batches?q&status&instructor&archived&page` · `GET /api/batches/:id`                                      | signed in (instructors: own)    |
|         | `GET /api/batches/options` (non-archived, for pickers)                                                            | signed in (instructors: own)    |
|         | `POST /api/admin/batches` · `PUT /:id` · `PATCH /:id/archive` · `PATCH /:id/modules/:moduleId`                     | admin                           |
| Sessions| `GET /api/sessions?day&from&to&batch&instructor&status&type&page` · `GET /calendar?month=` · `GET /:id`           | signed in (instructors: own batches) |
|         | `POST /api/sessions` · `PUT /:id` · `DELETE /:id`                                                                 | admin: any · instructor: own, on assigned batches |
| Updates | `GET /api/updates?from&to&status&page` · `GET /api/updates/:day`                                                  | admin, viewer                   |
|         | `PUT /api/updates/:day` (upsert — one update per IST day)                                                         | admin                           |
| Events  | `GET /api/events?from&to&type&status&batch&leader&sort&page` · `GET /:id`                                         | signed in (instructors: led/co-led) |
|         | `POST /api/admin/events` · `PUT /:id` · `PATCH /:id/complete` · `DELETE /:id`                                     | admin                           |
| Dashboard | `GET /api/dashboard` (today at a glance, role-aware)                                                          | signed in                       |
| Analytics | `GET /api/analytics/{kpis,batch-progress,sessions-over-time,instructor-workload,attendance-trend,session-status,events}?from&to&batch&instructor` | signed in (instructors: own numbers) |
|         | `GET /api/analytics/update-consistency`                                                                           | admin, viewer                   |

## Key decisions

- **Auth via httpOnly cookies.** A 15-minute access token and a 7-day refresh token, both httpOnly and
  `SameSite=Lax`; the refresh cookie is scoped to `/api/auth`. The refresh token rotates on every use.
  The Axios client refreshes once on a 401 and retries, sharing a single refresh across parallel requests.
- **Instant revocation.** Each user has a `tokenVersion` embedded in their tokens. `authenticate` re-reads the
  user on every request, so deactivating a user, changing a role or changing a password takes effect on the
  next request. A password change bumps `tokenVersion`, signing out every other device.
- **RBAC on the server.** The UI hides what a role can't use, but the API is the source of truth.
  The acting user's id and role always come from the token, never the request body.
- **IST days.** Instants are stored in UTC. Daily records also carry a `day` string (`YYYY-MM-DD` in
  Asia/Kolkata), which makes "what happened on this day" queries exact and index-friendly. The server
  decides what "today" is.
- **Same-origin API in development.** Vite proxies `/api` to the server, so cookies work without
  cross-site configuration. In production, serve the client and API from the same site or set
  `CLIENT_ORIGIN` and `VITE_API_URL` accordingly.
- **Batch dates are day strings.** `startDate`/`endDate` are stored as `YYYY-MM-DD` like other day fields, since a
  batch's dates have no time of day. Batch progress = completed sessions ÷ `totalPlannedSessions`.
- **Session rules.** Instructors always log as themselves (any `instructor` in the body is ignored), only on
  batches they're assigned to, and can edit or delete only sessions they took. Admins can log for any instructor
  assigned to the batch. Sessions can't be dated in the future or logged to archived batches.
- **Daily updates are keyed by day.** `PUT /api/updates/:day` creates or replaces the single update for that IST
  day (a unique index guarantees one per day). Past days can be back-filled; future days can't.
- **Events.** Instructors see the events they lead or co-lead. Only admins create, edit, complete or delete them;
  an event can't be marked completed before its day. Cancelling keeps a record; deleting removes it.
- **Analytics are aggregations.** Every number comes from a MongoDB pipeline over the filtered range (default:
  last 30 days); weekly series come back pivoted with empty weeks filled, ready to chart. Instructors' filters are
  forced to themselves on the server. Batch progress is cumulative, so it ignores the date range.
- **Charts.** A validated colour-blind-safe categorical palette (light and dark steps) in fixed order; a batch or
  person keeps its colour regardless of filters. Status colours are reserved and always labelled. Every chart has
  a tooltip, a legend when it has 2+ series, and a table view.
- **Activity log.** Mutations write a pre-rendered summary ("Asha created batch MERN-OCT-26") to `activities`,
  which feeds the dashboard's recent-activity list without joins. Logging failures never fail the request.
- **No public signup.** Accounts are created by an admin; the first admin comes from the seed script.
  Users are deactivated, never deleted, so history stays intact.

## Build status

- [x] Phase 1 — setup, auth + RBAC, admin seed, login, layout shell
- [x] Phase 2 — users admin, batches CRUD, batch detail
- [x] Phase 3 — sessions
- [x] Phase 4 — daily updates, events
- [x] Phase 5 — dashboard, analytics
- [ ] Phase 6 — polish, full demo seed
