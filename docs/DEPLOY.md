# FreshRoute — Free Public Deployment (2–3 day demo, **stable URLs, no credit card**)

Architecture: **Firebase Hosting** (React frontend) → **Koyeb** (NestJS backend, Docker) → **Neon** (Postgres).
All three have free tiers and need **no credit card**, and all give a **permanent URL** that does not change on restart.

> Why not Cloudflare quick tunnels / ngrok random URLs? They mint a **new URL every restart** — useless for a multi-day demo. Koyeb + Firebase give fixed URLs.

---

## 0. Prerequisites
- Repo pushed to GitHub (already: `github.com/mshayanfaisal/freshroute`).
- Your Neon connection values (host / user / password / db).
- A Gemini API key (works either way; without quota the app serves deterministic fallbacks).
- `npm i -g firebase-tools` and `firebase login` (once), for the frontend.

---

## 1. Backend → Koyeb (permanent API URL, no card)

1. Go to **https://app.koyeb.com** → sign up with **GitHub** (no card asked).
2. **Create Web Service → GitHub** → pick the `freshroute` repo, branch `main`.
3. **Builder: Dockerfile.** Set:
   - **Work directory / context:** `apps/backend`
   - **Dockerfile location:** `Dockerfile` (relative to the work directory → resolves to `apps/backend/Dockerfile`)
4. **Instance:** pick the **Free** (`nano` / eco) instance. **Region:** Washington or Frankfurt (any).
5. **Exposed port:** set to **`3000`** (the container listens there; the app also honours Koyeb's injected `$PORT`).
6. **Health check:** HTTP path **`/health`** on port `3000`.
7. **Environment variables** — add these (the secrets are NOT in git):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `POSTGRES_SSL` | `true` |
   | `POSTGRES_HOST` | `ep-floral-haze-aozl9dqt-pooler.c-2.ap-southeast-1.aws.neon.tech` |
   | `POSTGRES_PORT` | `5432` |
   | `POSTGRES_USER` | `neondb_owner` |
   | `POSTGRES_PASSWORD` | *(your Neon password)* |
   | `POSTGRES_DB` | `neondb` |
   | `JWT_ACCESS_SECRET` | *(any long random string)* |
   | `JWT_REFRESH_SECRET` | *(any other long random string)* |
   | `AI_PROVIDER` | `gemini` |
   | `AI_ENABLED` | `true` |
   | `AI_MAX_TOKENS` | `1024` |
   | `GEMINI_MODEL` | `gemini-2.0-flash` |
   | `GEMINI_API_KEY` | *(your Gemini key)* |
   | `RUN_SEED` | `true` |
   | `FRONTEND_ORIGIN` | `*` for now (tighten in step 3) |

   (`RUN_SEED=true` makes the Docker entrypoint run migrations + the idempotent seed on first boot. Since your Neon DB is already seeded it just no-ops.)
8. **Deploy.** First build takes ~3–5 min. When healthy you get a permanent URL like **`https://freshroute-<org>.koyeb.app`**.
9. Verify: open `https://freshroute-<org>.koyeb.app/health` → `{"status":"ok",...}` and `/api/docs` for Swagger.

---

## 2. Frontend → Firebase Hosting (permanent app URL, no card)

From the repo root, point the build at your Koyeb URL and deploy:

```bash
echo "VITE_API_URL=https://freshroute-<org>.koyeb.app" > apps/frontend/.env
npm run build --workspace=apps/frontend      # outputs apps/frontend/dist
firebase deploy --only hosting                # uses firebase.json → public: apps/frontend/dist
```

You'll get **`https://freshroute-6f348.web.app`** (permanent).

---

## 3. Lock CORS to your frontend
In Koyeb → service → **Environment**, set:

```
FRONTEND_ORIGIN = https://freshroute-6f348.web.app
```

Save → Koyeb redeploys. WebSockets connect directly to the Koyeb URL; the gateway allows the same origin.

---

## 4. Test the live demo
- Open `https://freshroute-6f348.web.app`, log in (`admin@greenvalley.coop` / `Password1!`, etc.).
- Data is already seeded on Neon (orders, a delivery run, a complaint), so the driver map + analytics are populated.
- Real-time: open two roles in two windows; WebSocket connects to Koyeb directly.

---

## Notes
- **`.env` files are gitignored — no secrets are committed.** Set all secrets in the Koyeb dashboard.
- Koyeb free instance may cold-start after long idle; hit `/health` a minute before presenting.
- Gemini quota: if the key returns `429 free-tier limit: 0`, the app serves deterministic AI fallbacks (still fully functional). Create a key in a Google project with the Generative Language API + billing enabled for live AI.
