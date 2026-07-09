# SmartSpendr — Goal Tracker & Budget App

## Stack
- Backend: Node.js + Express + MySQL (`mysql2`), JWT auth, bcrypt — `server/`
- Frontend: React (Vite) + Tailwind CSS + Recharts + React Router — `client/`

## 1. Database setup
1. Open phpMyAdmin, go to the **SQL** tab (on any database).
2. Run the contents of [`server/sql/schema.sql`](server/sql/schema.sql) — it creates the `milestone` database and its three tables (`users`, `goals`, `goal_months`).

## 2. Backend setup
```
cd server
cp .env.example .env   # then edit DB_USER / DB_PASSWORD / JWT_SECRET to match your setup
npm install
npm run dev             # http://localhost:4001
```

## 3. Frontend setup
```
cd client
npm install
npm run dev              # http://localhost:5173
```
The Vite dev server proxies `/api/*` to `http://localhost:4001`, so no CORS config is needed in development.

## 4. Using the app
1. Register an account, then log in.
2. Go to **My Goals** → **+ New Goal** and fill in the goal name, target amount, period (months), bank, and starting month. The monthly breakdown is generated automatically (remainder distributed into the last month).
3. Open a goal to see its monthly checklist — checking a month off immediately recalculates the saved amount, remaining balance, and progress charts.
4. **Dashboard** shows totals across all goals and a progress-by-goal chart. **Profile** lets you update your name/email and password.
5. **Settings** lets you pick an account-wide color theme (e.g. Blue & White, Pink & Black) — it's saved to your account and applies everywhere the moment you pick it.

## Navigation
Dashboard, My Goals, Profile, and Settings live in a collapsible sidebar (desktop: collapses to icons-only; mobile: slides in as an overlay via the hamburger button).

## Notes
- All monetary values are formatted in PHP (₱) via `Intl.NumberFormat`.
- JWTs are stored in `localStorage` (`smartspendr_token`) and attached as `Authorization: Bearer <token>` on every API request.
- IDs are generated with `crypto.randomUUID()` in the app layer (not MySQL's `UUID()`), so this works on any MySQL/MariaDB version.
- Theme is stored per-account in `users.theme` and re-applied on login; the sidebar's collapsed/expanded state is a local per-browser preference (`localStorage`).
"# SmartSpendr" 
