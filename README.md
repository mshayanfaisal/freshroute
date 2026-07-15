# 🥬 FreshRoute — AI-Powered Farm-to-Table Supply Chain Platform

FreshRoute connects small farms directly with restaurants and grocery stores, replacing
phone-based ordering with a real-time digital supply chain. It models perishable inventory
with time-based spoilage risk, runs a role-guarded multi-party order workflow
(farmer → platform → buyer → driver), and embeds AI to forecast demand, price produce
dynamically, classify quality complaints, and optimise delivery routes.

> **Web Technologies course project — Full-Stack Track.** React · NestJS · PostgreSQL · LLM AI · WebSocket · JWT.

---

## Table of Contents
1. [Tech stack](#tech-stack)
2. [Repository layout](#repository-layout)
3. [Quick start (Docker)](#quick-start-docker)
4. [Local development](#local-development)
5. [Demo accounts](#demo-accounts)
6. [Core features → where they live](#feature-map)
7. [AI proxy & graceful degradation](#ai-proxy)
8. [Real-time (WebSocket)](#real-time)
9. [Scheduled jobs (cron)](#cron)
10. [API docs (Swagger)](#swagger)
11. [Testing](#testing)
12. [Environment variables](#env)
13. [Deliverables & docs](#docs)

---

## <a name="tech-stack"></a>1. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router v6, Zustand + Context, Axios, Recharts, React-Leaflet |
| Backend | NestJS + TypeScript (modular), REST + Socket.io |
| ORM | TypeORM with SQL migrations |
| Database | PostgreSQL 15 (Dockerised) |
| Auth | JWT access + refresh pair (Passport.js), bcrypt, role guards |
| Real-time | Socket.io gateway with per-user / per-role rooms |
| AI | Multi-provider LLM via a NestJS proxy (Anthropic Claude, Google Gemini, or OpenAI-compatible gateway) — **no keys in the frontend** |
| API docs | Swagger, auto-generated at `/api/docs` |
| Testing | Jest + Supertest (controller/role-guard integration tests) |

## <a name="repository-layout"></a>2. Repository layout

```
freshroute/
├── docker-compose.yml         # one-command DB + backend
├── .env.example               # copy to .env
├── apps/
│   ├── backend/               # NestJS API
│   │   └── src/
│   │       ├── common/        # enums, guards (JWT + Roles), decorators
│   │       ├── config/        # typed env configuration
│   │       ├── database/      # data-source, migrations, seed
│   │       └── modules/       # auth, users, produce, orders, deliveries,
│   │                          # complaints, ai, analytics, scheduler, realtime
│   └── frontend/              # React + Vite SPA (role dashboards)
└── docs/                      # System design, AI integration, reflection outline
```

## <a name="quick-start-docker"></a>3. Quick start (Docker)

Brings up PostgreSQL **and** the backend (migrations + seed run automatically) with one command:

```bash
cp .env.example .env
# (optional) add your ANTHROPIC_API_KEY to .env to enable live AI; blank = graceful fallback
docker compose up --build
```

- Backend + Swagger: <http://localhost:3000/api/docs>
- The backend container runs migrations then seeds demo data on boot.

Then start the frontend (Vite dev server proxies `/api` and `/ws` to the backend):

```bash
npm install                    # root — installs workspaces
npm run dev:frontend           # http://localhost:5173
```

## <a name="local-development"></a>4. Local development (without Docker)

```bash
# 1. Start Postgres 15 and create a database matching .env
# 2. Install workspaces
npm install
# 3. Run migrations + seed
npm run migration:run
npm run seed
# 4. Run both apps (backend :3000, frontend :5173)
npm run dev
```

## <a name="demo-accounts"></a>5. Demo accounts

All seeded accounts use the password **`Password1!`**.

| Role | Email |
|---|---|
| Admin | `admin@greenvalley.coop` |
| Farmer | `maria@greenvalley.coop`, `john@greenvalley.coop` |
| Buyer | `bistro@downtown.com`, `grocer@corner.com` |
| Driver | `dave@greenvalley.coop`, `nina@greenvalley.coop` |

## <a name="feature-map"></a>6. Core features → where they live

| Module | Backend | Frontend |
|---|---|---|
| Multi-role auth (4 roles) | `modules/auth`, `common/guards` | `pages/Login`, `pages/Register`, `components/ProtectedRoute` |
| Produce catalogue + spoilage engine | `modules/produce` (`spoilage.util.ts`) | `pages/farmer/Listings`, `pages/buyer/Catalogue` |
| Order workflow (guarded state machine) | `modules/orders` | `pages/buyer/*`, `pages/farmer/Orders` |
| Delivery scheduling + map tracker | `modules/deliveries` | `pages/admin/Scheduling`, `pages/driver/Deliveries` |
| Quality & traceability | `modules/complaints` | `pages/*/Complaints` |
| Admin analytics (≥4 charts) | `modules/analytics` | `pages/admin/Analytics` |
| AI proxy (4 features) | `modules/ai` | forecast/pricing/complaint/route UIs |
| Real-time notifications | `modules/realtime` | `store/socket.ts`, `components/Toasts` |
| Cron jobs | `modules/scheduler` | — |

**Order state machine** (role-guarded in `orders.service.ts`):
`Pending → Confirmed → Packed → In Transit → Delivered / Disputed` (+ `Cancelled`).

**Spoilage risk** (`produce/spoilage.util.ts`): fraction of shelf life consumed —
`<50%` low, `50–80%` medium, `>80%` high. High-risk items are surfaced first in the buyer
catalogue and trigger farmer alerts via the hourly cron.

## <a name="ai-proxy"></a>7. AI proxy & graceful degradation

All LLM calls route through `modules/ai` — the React client only ever calls authenticated
`/api/ai/*` endpoints. The backend supports **three interchangeable providers**:

| Provider | Env vars | Default model |
|---|---|---|
| Anthropic | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` | `claude-opus-4-8` |
| Google Gemini | `AI_PROVIDER=gemini`, `GEMINI_API_KEY` | `gemini-2.0-flash` |
| OpenAI-compatible | `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` | `gpt-4o-mini` |

Every feature has a deterministic fallback (see `ai.service.ts`):

| Feature | Endpoint | Fallback when AI unavailable |
|---|---|---|
| 1. Demand forecaster | `GET /api/ai/forecast` | last-4-week rolling average |
| 2. Dynamic pricing | `GET /api/ai/pricing/:produceId` | farmer's own historical price range, no suggestion |
| 3. Complaint classifier | `POST /api/ai/classify-complaint` | manual category dropdown |
| 4. Route optimiser (bonus) | `POST /api/ai/optimise-route` | nearest-neighbour heuristic |

Set `AI_PROVIDER` and the corresponding API key in `.env` to enable live AI. Leave the key
blank and everything still works via fallbacks (`GET /api/ai/status` reports which mode is
active). Every suggestion is logged to `ai_suggestions` for the accuracy analytics.

## <a name="real-time"></a>8. Real-time (WebSocket)

Socket.io gateway at namespace `/ws`, authenticated with the access-token JWT. Each socket
joins `user:<id>` and `role:<role>` rooms. Events: order placed / status changed, delivery
assigned, stop updated, complaint submitted / **escalated (critical → admins)** / resolved,
spoilage alerts.

## <a name="cron"></a>9. Scheduled jobs

- **Hourly** — recompute spoilage risk for all listings and alert farmers of high-risk stock.
- **Daily 06:00** — push each driver their delivery schedule summary.
  (Admins can trigger on demand: `POST /api/scheduler/driver-summary/run`.)

## <a name="swagger"></a>10. API docs (Swagger)

Auto-generated from decorators at **`/api/docs`** (JSON at `/api/docs-json`). Bearer auth is
wired in — click *Authorize*, paste an access token, and exercise every endpoint.

## <a name="testing"></a>11. Testing

```bash
npm run test                    # backend Jest + Supertest (from root)
npm run test:cov -w apps/backend  # with coverage report (backend workspace)
```

35 integration tests cover authentication and **role-guard enforcement** (401/403) across all
protected controllers — **87% controller statement coverage, 100% branch** (min required: 60%).

## <a name="env"></a>12. Environment variables

See [`.env.example`](.env.example). No secret is ever hardcoded; the frontend receives none.

## <a name="docs"></a>13. Deliverables & docs

- [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) — ER diagram, API contract, component tree, AI architecture
- [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md) — prompt templates, context strategy, fallbacks, prompt iterations, privacy
- [`docs/REFLECTION_OUTLINE.md`](docs/REFLECTION_OUTLINE.md) — structure for the team-authored reflection

> **Academic integrity:** the analytical prose of the System Design Document and the
> Reflection Report must be written by the team. The `docs/` files provide the factual,
> code-derived scaffolding (diagrams, contracts, prompt templates) to build on — not
> substitute prose for those graded narratives.
