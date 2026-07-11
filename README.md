# SmartSpendr — Goal Tracker & Budget App

## Stack
- Backend: Node.js + Express + PostgreSQL (`pg`), JWT auth, bcrypt — `server/`
- Frontend: React (Vite) + Tailwind CSS + Recharts + React Router — `client/`

## 1. Database setup (Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor** and run the contents of [`server/sql/schema.sql`](server/sql/schema.sql) — it creates all tables (`users`, `goals`, `goal_months`, `categories`, `transactions`, `category_budgets`, `debt_bill_items`, `months`).
3. Go to **Project Settings → Database → Connection string** and copy the **Transaction pooler** URI (port 6543) — this is your `DATABASE_URL`.

## 2. Backend setup
```
cd server
cp .env.example .env   # then set DATABASE_URL (from step 1) and JWT_SECRET
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
- IDs are generated with `crypto.randomUUID()` in the app layer (not a database-generated UUID), so no Postgres extension is required.
- Theme is stored per-account in `users.theme` and re-applied on login; the sidebar's collapsed/expanded state is a local per-browser preference (`localStorage`).

## 5. Deploying (Vercel)
Deploy `client/` and `server/` as two separate Vercel projects (both already have their own `vercel.json`):

1. **Server project** — root directory `server/`. Add environment variables in the Vercel dashboard: `DATABASE_URL` (Supabase pooled connection string), `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (the client project's deployed URL). Vercel runs `server/api/index.js`, which exports the Express app as a serverless function; `server/vercel.json` rewrites all paths to it.
2. **Client project** — root directory `client/`. Add `VITE_API_URL` pointing at the deployed server, e.g. `https://<server-project>.vercel.app/api`.
3. Push to `main` (or redeploy from the dashboard) to trigger both deployments.

