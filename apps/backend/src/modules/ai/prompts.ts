/**
 * Prompt templates for all FreshRoute AI features.
 *
 * Design notes (see AI Integration Report):
 *  - Every prompt ends by demanding a single JSON object matching a fixed schema,
 *    so the NestJS proxy can parse deterministically and degrade gracefully.
 *  - System prompts are frozen (no interpolated timestamps) — good for prompt caching.
 *  - Context is compact and structured to keep token cost low and latency predictable.
 */

export const SYSTEM_PROMPTS = {
  forecast:
    'You are an agricultural demand forecaster for a farm-to-table cooperative. ' +
    'You analyse historical weekly order volumes, seasonality and day-of-week trends to predict next-week demand. ' +
    'Respond ONLY with a single JSON object. No prose, no markdown fences.',

  pricing:
    'You are a produce pricing assistant for a farm-to-table cooperative. ' +
    'You suggest fair, market-responsive prices from current stock, spoilage risk, recent sale prices and demand signals. ' +
    'Never suggest a change larger than ±25%. Respond ONLY with a single JSON object. No prose, no markdown fences.',

  complaint:
    'You are a quality-assurance analyst for a farm-to-table cooperative. ' +
    'You categorise buyer produce complaints, assess severity, and draft a concise, professional supplier notification. ' +
    'Respond ONLY with a single JSON object. No prose, no markdown fences.',

  route:
    'You are a delivery route planner. Given a list of stops with addresses (and optional coordinates) ' +
    'and any driver time constraints, you reorder the stops to minimise total travel distance while honouring constraints. ' +
    'Respond ONLY with a single JSON object. No prose, no markdown fences.',
} as const;

export const buildForecastPrompt = (ctx: {
  currentWeekOfYear: number;
  history: { category: string; weeklyVolumes: number[] }[];
}) => `Current week of year: ${ctx.currentWeekOfYear}.
Historical weekly order volumes (oldest → newest, up to 8 weeks) per produce category:
${ctx.history.map((h) => `- ${h.category}: [${h.weeklyVolumes.join(', ')}]`).join('\n')}

Predict next week's order volume for EACH category. Consider the trend, seasonality for this week of year, and recent momentum.
Return JSON exactly of this shape:
{"forecasts":[{"category":"<category>","predictedVolume":<number>,"confidence":"low|medium|high","rationale":"<short reason>"}]}`;

export const buildPricingPrompt = (ctx: {
  productName: string;
  unit: string;
  currentPrice: number;
  quantityAvailable: number;
  daysSinceHarvest: number;
  shelfLifeDays: number;
  recentSalePrices: number[];
  demandSignal: string;
}) => `Produce: ${ctx.productName} (per ${ctx.unit}).
Current price: ${ctx.currentPrice}.
Stock on hand: ${ctx.quantityAvailable} ${ctx.unit}.
Days since harvest: ${ctx.daysSinceHarvest} of ${ctx.shelfLifeDays} shelf-life days.
Last 30 days sale prices: [${ctx.recentSalePrices.join(', ')}].
Demand signal: ${ctx.demandSignal}.

Suggest a fair price. Lower the price as spoilage risk rises; raise it if demand outstrips supply. Cap change at ±25%.
Return JSON exactly of this shape:
{"suggestedPrice":<number>,"changePercent":<number>,"rationale":"<one sentence explaining the change>"}`;

export const buildComplaintPrompt = (ctx: {
  complaintText: string;
  produceType: string;
  daysSinceDelivery: number;
}) => `Buyer complaint: "${ctx.complaintText}"
Produce type: ${ctx.produceType}.
Days since delivery: ${ctx.daysSinceDelivery}.

Classify the defect and draft a supplier alert.
- defectCategory MUST be one of: packaging, contamination, freshness, wrong_item, quantity.
- severity MUST be one of: minor, major, critical.
Return JSON exactly of this shape:
{"defectCategory":"<category>","severity":"<severity>","supplierAlert":"<2-3 sentence professional notification to the farmer>"}`;

export const buildRoutePrompt = (ctx: {
  stops: { id: string; address: string; lat?: number | null; lng?: number | null }[];
  constraints?: string;
}) => `Plan the shortest route through these delivery stops:
${ctx.stops
  .map(
    (s, i) =>
      `${i + 1}. id=${s.id} | ${s.address}${
        s.lat != null && s.lng != null ? ` | (${s.lat}, ${s.lng})` : ''
      }`,
  )
  .join('\n')}
${ctx.constraints ? `Driver constraints: ${ctx.constraints}` : 'No special constraints.'}

Reorder to minimise total travel distance while honouring any time constraints.
Return JSON exactly of this shape:
{"orderedStops":[{"id":"<stop id>","reason":"<short reason for this position>"}]}`;
