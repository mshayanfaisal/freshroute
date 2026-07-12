# Deliverable 5 — Reflection & Demo (team-authored)

> ⚠️ **Academic integrity:** the 1,500–2,000 word reflection **must be written by the team**,
> not generated. This file is only a *structure* plus factual pointers so you can write from
> your own understanding. Do not paste generated prose into the submission.

---

## A. Live demo — two end-to-end flows (15 min)

Pick two of the flows below. Log in with the seeded accounts (`Password1!`).

### Flow 1 — Order → delivery (multi-party, real-time)
1. **Buyer** (`bistro@downtown.com`) → Catalogue → add produce from *two different farmers* →
   Place order. Watch the toast; note high-spoilage items sorted first.
2. **Farmer** (`maria@greenvalley.coop`) → Incoming Orders → *Confirm* → *Pack*. (Real-time
   status toast reaches the buyer's Orders page.)
3. **Admin** (`admin@greenvalley.coop`) → Scheduling → assign the order to a driver → create run.
4. **Driver** (`dave@greenvalley.coop`) → Deliveries → see the stop on the Leaflet map →
   run the **AI route optimiser** → mark the stop **Delivered**. Buyer is notified instantly;
   order shows partial/full fulfilment.

### Flow 2 — Quality complaint with AI (classification + escalation)
1. **Buyer** → Complaints → pick a delivered line → describe the issue → **Classify with AI**
   (defect category + severity + drafted supplier alert) → Submit.
2. If severity is **critical**, the **Admin** Complaints page receives a real-time escalation.
3. **Admin** → move Submitted → Under Review → Resolve (credit / replace / reject). Buyer is
   notified of the outcome.
4. **Farmer** sees the complaint (and the AI-drafted supplier alert) under "Complaints".

### Also worth showing
- **Farmer forecast** (AI Feature 1) + **dynamic pricing** accept flow (AI Feature 2).
- **Admin analytics** — five chart types, waste rate, top buyers, driver success, AI performance.
- **Graceful degradation** — stop the AI key (or run with it blank) and show the same features
  working via fallbacks; `GET /api/ai/status` flips to `{enabled:false}`.

---

## B. Reflection report — required structure (write in your own words)

The rubric asks for **three architectural decisions**, their tradeoffs, and what you'd change.
Below are factual starting points from *this* codebase — turn each into your own analysis.

### Decision 1 — Role-guarded order state machine in one service
- **What we did:** a single `TRANSITIONS` map in `orders.service.ts` defines both the legal
  status transitions *and* which role may perform each; the guard runs after `JwtAuthGuard`.
- **Discuss:** the tradeoff vs. a per-endpoint approach or a workflow engine; how it centralises
  correctness but couples all transitions in one file; edge cases (multi-farmer orders where a
  farmer may only act on orders containing their own line).

### Decision 2 — AI behind a proxy with mandatory deterministic fallbacks
- **What we did:** `AiService` owns the only API key; every feature has a fallback and every
  suggestion is logged. Pricing is re-clamped server-side; route output is validated as a
  permutation.
- **Discuss:** the tradeoff between richer AI output and reliability/safety; why "AI-optional"
  was a design goal; cost/latency/privacy implications; how the audit log enables accuracy metrics.

### Decision 3 — (choose one)
- **Access + refresh JWT with hashed refresh-token rotation** (`auth.service.ts`) — stateless
  access tokens vs. server-side session revocation; why we store only a bcrypt hash of the
  refresh token. **or**
- **Denormalised `order_lines` (farmer_id, product_name, harvest_date snapshots)** — write-time
  duplication for read performance, per-farmer notifications, and traceability vs. normalisation.
  **or**
- **Migrations own the schema (`synchronize:false`)** — reproducibility & "runs from scratch"
  vs. the convenience of auto-sync.

### What we would change
Prompts to consider: code-splitting the frontend bundle; moving AI calls to a queue for
retries/rate-limits; adding optimistic UI; richer geocoding for the map; per-line (not per-order)
delivery status; test coverage on services (not just controllers).

### Individual contributions
Map each teammate to modules/pages (Git history backs this up). Every member should be able to
speak to at least one backend module, one frontend area, and one AI feature for the viva.
