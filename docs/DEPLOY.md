# FreshRoute — Free Public Deployment (2–3 day demo)

Architecture: **Firebase Hosting** (React frontend) → **Render** (NestJS backend, Docker) → **Neon** (Postgres). All three have free tiers and need no credit card.

> Render's free web service **sleeps after ~15 min idle** and cold-starts in ~30–60 s. Fine for a demo; just hit the URL a minute before presenting to wake it.

---

## 0. Prerequisites
- Repo pushed to GitHub (already: `github.com/mshayanfaisal/freshroute`).
- Your Neon connection values (host / user / password / db).
- A Gemini API key **with quota** (see note at the bottom).
- `npm i -g firebase-tools` and `firebase login` (once).

---

## 1. Backend → Render (public API URL)

1. Go to **https://render.com** → sign up (GitHub login) → **New → Blueprint**.
2. Select the `freshroute` repo. Render reads **`render.yaml`** and proposes the `freshroute-api` service.
3. Click **Apply**, then open the service's **Environment** tab and set the secret vars:

   | Key | Value |
   |---|---|
   | `POSTGRES_HOST` | `ep-floral-haze-aozl9dqt-pooler.c-2.ap-southeast-1.aws.neon.tech` |
   | `POSTGRES_USER` | `neondb_owner` |
   | `POSTGRES_PASSWORD` | *(your Neon password)* |
   | `POSTGRES_DB` | `neondb` |
   | `GEMINI_API_KEY` | *(your Gemini key)* |
   | `FRONTEND_ORIGIN` | `*` for now (tighten in step 3) |

   (`JWT_*` secrets auto-generate; `POSTGRES_SSL=true`, `RUN_MIGRATIONS=true`, `RUN_SEED=true` are already set in the blueprint — migrations + seed run automatically on first boot.)
4. Deploy. When it's live you get a URL like **`https://freshroute-api.onrender.com`**.
5. Verify: open `https://freshroute-api.onrender.com/health` → `{"status":"ok",...}` and `/api/docs` for Swagger.

---

## 2. Frontend → Firebase Hosting (public app URL)

From the repo root:

```bash
# Point the frontend at your Render backend, then build
echo "VITE_API_URL=https://freshroute-api.onrender.com" > apps/frontend/.env
npm run build --workspace=apps/frontend      # outputs apps/frontend/dist

# Deploy (uses firebase.json → public: apps/frontend/dist)
firebase deploy --only hosting
```

You'll get **`https://freshroute-6f348.web.app`**.

*(Optional CI: instead of the manual build+deploy, set a GitHub **repo variable** `VITE_API_URL` to the Render URL and the included workflows deploy on push to `main`.)*

---

## 3. Lock CORS to your frontend
Back in Render → `freshroute-api` → Environment → set:

```
FRONTEND_ORIGIN = https://freshroute-6f348.web.app
```

Save → Render redeploys. (WebSockets connect directly to the Render URL; the gateway already allows that.)

---

## 4. Test the live demo
- Open `https://freshroute-6f348.web.app`, log in (`admin@greenvalley.coop` / `Password1!`, etc.).
- Data is already seeded on Neon (orders, a delivery run, a complaint), so the driver map + analytics are populated.
- Real-time: open two roles in two windows; WebSocket connects to Render directly.

---

## Gemini quota note
Your current key returns `429 — free-tier limit: 0` (the Google project has no quota). To get **live** AI instead of fallbacks: in **Google AI Studio → API keys**, create a key in a project with the Generative Language API enabled and billing/free-tier active, then update `GEMINI_API_KEY` on Render. The app works either way — without quota it serves deterministic fallbacks and `GET /api/ai/status` returns `{"enabled":true}` but responses fall back on the 429.

## Notes
- `.env` files are gitignored — no secrets are committed. Set all secrets in the Render dashboard.
- To keep the backend awake during a live demo, ping `/health` every few minutes (e.g. an uptime pinger) or just load it beforehand.
