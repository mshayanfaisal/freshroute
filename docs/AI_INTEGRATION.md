# FreshRoute — AI Integration Reference

> Source of truth for **Deliverable 4**. The prompt templates below are the exact strings
> used in `apps/backend/src/modules/ai/prompts.ts`; the context/fallback behaviour matches
> `ai.service.ts` and `ai-insights.service.ts`. The team should expand the *rationale/analysis*
> in their own words for the submitted report.

Model: **`claude-opus-4-8`** (Anthropic), called from the NestJS proxy only. Requests use a
frozen system prompt + a compact structured user prompt, and demand a single JSON object so
the proxy can parse deterministically and degrade gracefully.

---

## Feature 1 — Demand Forecaster

**System prompt**
> You are an agricultural demand forecaster for a farm-to-table cooperative. You analyse
> historical weekly order volumes, seasonality and day-of-week trends to predict next-week
> demand. Respond ONLY with a single JSON object. No prose, no markdown fences.

**User prompt (template)**
```
Current week of year: {week}.
Historical weekly order volumes (oldest → newest, up to 8 weeks) per produce category:
- {category}: [{v1, v2, ...}]
...
Predict next week's order volume for EACH category. Consider the trend, seasonality for this
week of year, and recent momentum.
Return JSON exactly of this shape:
{"forecasts":[{"category","predictedVolume","confidence":"low|medium|high","rationale"}]}
```

- **Input context:** SQL aggregation of the last 8 ISO weeks of `quantity_ordered` grouped by
  produce category (`ai-insights.service.ts`), plus the current week of year.
- **Output handling:** enums coerced (`confidence`), numbers cast.
- **Fallback:** last-4-week rolling average per category, `confidence: low`.

## Feature 2 — Dynamic Pricing Assistant

**System prompt**
> You are a produce pricing assistant … suggest fair, market-responsive prices from current
> stock, spoilage risk, recent sale prices and demand signals. Never suggest a change larger
> than ±25%. Respond ONLY with a single JSON object.

**User prompt (template)**
```
Produce: {name} (per {unit}). Current price: {price}. Stock: {qty}.
Days since harvest: {d} of {shelfLife}. Last 30 days sale prices: [...]. Demand signal: {signal}.
Return JSON: {"suggestedPrice","changePercent","rationale"}
```

- **Input context:** listing + `daysSinceHarvest`, 30-day sale-price history, and a demand
  signal (last-7-day units ordered vs current stock).
- **Output handling:** the proxy **re-clamps** the suggested price to ±25% of current price
  server-side regardless of the model output, then recomputes `changePercent`.
- **Fallback:** no suggestion; return the farmer's own historical min/max/avg price range.

## Feature 3 — Quality Complaint Classifier

**System prompt**
> You are a quality-assurance analyst … categorise buyer produce complaints, assess severity,
> and draft a concise, professional supplier notification. Respond ONLY with a single JSON object.

**User prompt (template)**
```
Buyer complaint: "{text}"  Produce type: {type}.  Days since delivery: {n}.
- defectCategory MUST be one of: packaging, contamination, freshness, wrong_item, quantity.
- severity MUST be one of: minor, major, critical.
Return JSON: {"defectCategory","severity","supplierAlert"}
```

- **Output handling:** category + severity coerced to enums; `critical` severity triggers a
  WebSocket escalation to admins (`complaints.service.ts`).
- **Fallback:** classification is skipped; the buyer picks a category from a manual dropdown
  (`manualCategory` on the complaint DTO).

## Feature 4 (Bonus) — Route Optimiser Chat

**System prompt**
> You are a delivery route planner … reorder the stops to minimise total travel distance while
> honouring constraints. Respond ONLY with a single JSON object.

**User prompt (template)**
```
Plan the shortest route through these delivery stops:
1. id={id} | {address} | ({lat},{lng})
...
Driver constraints: {free-text or "No special constraints."}
Return JSON: {"orderedStops":[{"id","reason"}]}
```

- **Output handling:** the proxy verifies the returned `orderedStops` is a permutation of the
  input stop set; if not, it falls back.
- **Fallback:** nearest-neighbour heuristic over stop coordinates (Haversine), else original order.

---

## Context management strategy

- **Compact, structured context** — only the fields each feature needs, assembled server-side
  from SQL aggregates rather than dumping raw rows. Keeps token cost and latency low.
- **Frozen system prompts** — no interpolated timestamps/IDs, which keeps prompts cache-friendly.
- **Server-side guard rails** — pricing clamp (±25%), route permutation check, enum coercion —
  so a malformed or adversarial model response can never corrupt domain state.
- **Auditability** — every call (input, output, `used_fallback`, model) is persisted to
  `ai_suggestions`, powering the forecast-accuracy and pricing-acceptance analytics.

## Fallback / degradation behaviour (summary)

| Feature | Trigger | Behaviour |
|---|---|---|
| Forecast | no key / API error | rolling 4-week average |
| Pricing | no key / API error | historical price range, no suggestion |
| Complaint | no key / API error | manual category dropdown |
| Route | no key / API error | nearest-neighbour / original order |

`GET /api/ai/status` reports `{enabled}` so the UI can label AI vs fallback mode.

---

## Prompt iterations (documented)

**Iteration A → B (all features): "return JSON" → "Respond ONLY with a single JSON object.
No prose, no markdown fences."**
Rationale: early drafts occasionally wrapped JSON in ```json fences or added a lead-in
sentence, which broke naive `JSON.parse`. Tightening the instruction (and adding a
regex-extract fallback in `parseJson`) eliminated parse failures.

**Iteration A → B (pricing): added the explicit "Never suggest a change larger than ±25%"
constraint plus a server-side clamp.**
Rationale: without the bound the model occasionally proposed aggressive swings on thin sale
histories. The prompt constraint improves the rationale quality and the server clamp
guarantees safety even if the model ignores it.

*(Teams should add a third documented iteration from their own testing, e.g. tuning the
complaint severity calibration or the forecast confidence banding.)*

---

## Data privacy implications (one paragraph — expand in your own words)

FreshRoute sends only the minimum operational data needed for each inference: aggregated
order volumes, produce attributes, sale-price ranges, free-text complaint descriptions, and
delivery addresses/coordinates. No authentication credentials, payment data, or personal
contact details are included in any prompt. Because complaint text and delivery addresses are
personal/operational data, they leave our infrastructure for the LLM provider on each call —
so the platform (a) routes every request through the server-side proxy (never the browser),
(b) can be run fully offline via the deterministic fallbacks with **no** external calls, and
(c) logs suggestions internally for accuracy tracking rather than relying on the provider to
retain them. A production deployment should add a data-processing agreement with the provider,
PII redaction on complaint free-text, and a per-user opt-out that forces fallback mode.
