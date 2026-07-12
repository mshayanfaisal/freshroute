import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { AppConfig } from '../../config/configuration';
import { AiSuggestion } from './ai-suggestion.entity';
import {
  AiFeature,
  ConfidenceBand,
  DefectCategory,
  DefectSeverity,
} from '../../common/enums';
import {
  SYSTEM_PROMPTS,
  buildComplaintPrompt,
  buildForecastPrompt,
  buildPricingPrompt,
  buildRoutePrompt,
} from './prompts';

export interface ForecastResult {
  forecasts: {
    category: string;
    predictedVolume: number;
    confidence: ConfidenceBand;
    rationale: string;
  }[];
  usedFallback: boolean;
}

export interface PricingResult {
  suggestedPrice: number | null;
  changePercent: number | null;
  rationale: string;
  historicalRange?: { min: number; max: number; avg: number };
  usedFallback: boolean;
}

export interface ComplaintClassification {
  defectCategory: DefectCategory | null;
  severity: DefectSeverity | null;
  supplierAlert: string | null;
  usedFallback: boolean;
}

export interface RouteResult {
  orderedStops: { id: string; reason: string }[];
  usedFallback: boolean;
}

/**
 * The single NestJS AI proxy. All LLM calls originate here — the React client
 * never holds an API key. Each feature has a deterministic fallback so the
 * platform degrades gracefully when ANTHROPIC_API_KEY is unset or the API errors.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    @InjectRepository(AiSuggestion)
    private readonly suggestions: Repository<AiSuggestion>,
  ) {
    const ai = this.config.get('ai', { infer: true });
    this.enabled = ai.enabled;
    this.model = ai.model;
    this.maxTokens = ai.maxTokens;
    this.client = ai.enabled ? new Anthropic({ apiKey: ai.apiKey }) : null;
    if (!this.enabled) {
      this.logger.warn('AI disabled (no ANTHROPIC_API_KEY) — serving deterministic fallbacks.');
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  // ────────────────────────────── Feature 1: Demand Forecaster ──────────────────────────────
  async forecastDemand(
    userId: string | null,
    currentWeekOfYear: number,
    history: { category: string; weeklyVolumes: number[] }[],
  ): Promise<ForecastResult> {
    const fallback = (): ForecastResult => ({
      // Fallback: last-4-week rolling average.
      forecasts: history.map((h) => {
        const last4 = h.weeklyVolumes.slice(-4);
        const avg = last4.length ? Math.round(last4.reduce((a, b) => a + b, 0) / last4.length) : 0;
        return {
          category: h.category,
          predictedVolume: avg,
          confidence: ConfidenceBand.LOW,
          rationale: 'Rolling 4-week average (AI unavailable).',
        };
      }),
      usedFallback: true,
    });

    if (!this.client) return this.log(AiFeature.DEMAND_FORECAST, userId, null, { currentWeekOfYear, history }, fallback());

    try {
      const json = await this.complete(SYSTEM_PROMPTS.forecast, buildForecastPrompt({ currentWeekOfYear, history }));
      const forecasts = (json.forecasts as any[]).map((f) => ({
        category: String(f.category),
        predictedVolume: Number(f.predictedVolume),
        confidence: this.coerceConfidence(f.confidence),
        rationale: String(f.rationale ?? ''),
      }));
      return this.log(AiFeature.DEMAND_FORECAST, userId, null, { currentWeekOfYear, history }, { forecasts, usedFallback: false });
    } catch (e) {
      this.logger.error(`Forecast AI call failed: ${(e as Error).message}`);
      return this.log(AiFeature.DEMAND_FORECAST, userId, null, { currentWeekOfYear, history }, fallback());
    }
  }

  // ────────────────────────────── Feature 2: Dynamic Pricing ──────────────────────────────
  async suggestPrice(
    userId: string | null,
    subjectId: string | null,
    ctx: {
      productName: string;
      unit: string;
      currentPrice: number;
      quantityAvailable: number;
      daysSinceHarvest: number;
      shelfLifeDays: number;
      recentSalePrices: number[];
      demandSignal: string;
    },
  ): Promise<PricingResult> {
    const fallback = (): PricingResult => {
      // Fallback: show the farmer's own historical price range, no AI suggestion.
      const prices = ctx.recentSalePrices.length ? ctx.recentSalePrices : [ctx.currentPrice];
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      return {
        suggestedPrice: null,
        changePercent: null,
        rationale: 'AI unavailable — showing your recent price range only.',
        historicalRange: { min, max, avg: Math.round(avg * 100) / 100 },
        usedFallback: true,
      };
    };

    if (!this.client) return this.log(AiFeature.DYNAMIC_PRICING, userId, subjectId, ctx, fallback());

    try {
      const json = await this.complete(SYSTEM_PROMPTS.pricing, buildPricingPrompt(ctx));
      let suggested = Number(json.suggestedPrice);
      // Enforce the ±25% guard rail server-side regardless of what the model returns.
      const upper = ctx.currentPrice * 1.25;
      const lower = ctx.currentPrice * 0.75;
      suggested = Math.min(upper, Math.max(lower, suggested));
      const changePercent = Math.round(((suggested - ctx.currentPrice) / ctx.currentPrice) * 1000) / 10;
      return this.log(AiFeature.DYNAMIC_PRICING, userId, subjectId, ctx, {
        suggestedPrice: Math.round(suggested * 100) / 100,
        changePercent,
        rationale: String(json.rationale ?? ''),
        usedFallback: false,
      });
    } catch (e) {
      this.logger.error(`Pricing AI call failed: ${(e as Error).message}`);
      return this.log(AiFeature.DYNAMIC_PRICING, userId, subjectId, ctx, fallback());
    }
  }

  // ────────────────────────────── Feature 3: Complaint Classifier ──────────────────────────────
  async classifyComplaint(
    userId: string | null,
    subjectId: string | null,
    ctx: { complaintText: string; produceType: string; daysSinceDelivery: number },
  ): Promise<ComplaintClassification> {
    // Fallback: no classification → the buyer picks a category from a manual dropdown.
    const fallback = (): ComplaintClassification => ({
      defectCategory: null,
      severity: null,
      supplierAlert: null,
      usedFallback: true,
    });

    if (!this.client) return this.log(AiFeature.COMPLAINT_CLASSIFIER, userId, subjectId, ctx, fallback());

    try {
      const json = await this.complete(SYSTEM_PROMPTS.complaint, buildComplaintPrompt(ctx));
      return this.log(AiFeature.COMPLAINT_CLASSIFIER, userId, subjectId, ctx, {
        defectCategory: this.coerceDefect(json.defectCategory),
        severity: this.coerceSeverity(json.severity),
        supplierAlert: String(json.supplierAlert ?? ''),
        usedFallback: false,
      });
    } catch (e) {
      this.logger.error(`Complaint AI call failed: ${(e as Error).message}`);
      return this.log(AiFeature.COMPLAINT_CLASSIFIER, userId, subjectId, ctx, fallback());
    }
  }

  // ────────────────────────────── Feature 4 (Bonus): Route Optimiser ──────────────────────────────
  async optimiseRoute(
    userId: string | null,
    subjectId: string | null,
    stops: { id: string; address: string; lat?: number | null; lng?: number | null }[],
    constraints?: string,
  ): Promise<RouteResult> {
    const fallback = (): RouteResult => ({
      // Fallback: nearest-neighbour heuristic when coordinates exist, else original order.
      orderedStops: this.nearestNeighbour(stops).map((id) => ({ id, reason: 'Heuristic ordering (AI unavailable).' })),
      usedFallback: true,
    });

    if (!this.client) return this.log(AiFeature.ROUTE_OPTIMISER, userId, subjectId, { stops, constraints }, fallback());

    try {
      const json = await this.complete(SYSTEM_PROMPTS.route, buildRoutePrompt({ stops, constraints }));
      const ordered = (json.orderedStops as any[])
        .map((s) => ({ id: String(s.id), reason: String(s.reason ?? '') }))
        .filter((s) => stops.some((st) => st.id === s.id));
      // Guard: if the model dropped/duplicated stops, fall back.
      if (ordered.length !== stops.length) throw new Error('Model returned an incomplete stop set');
      return this.log(AiFeature.ROUTE_OPTIMISER, userId, subjectId, { stops, constraints }, { orderedStops: ordered, usedFallback: false });
    } catch (e) {
      this.logger.error(`Route AI call failed: ${(e as Error).message}`);
      return this.log(AiFeature.ROUTE_OPTIMISER, userId, subjectId, { stops, constraints }, fallback());
    }
  }

  // ────────────────────────────── Internals ──────────────────────────────

  /** One LLM round-trip returning a parsed JSON object. Throws on any failure. */
  private async complete(system: string, userPrompt: string): Promise<Record<string, any>> {
    const res = await this.client!.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = res.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim();
    return this.parseJson(text);
  }

  /** Robustly extract the first JSON object from a model response. */
  private parseJson(text: string): Record<string, any> {
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Model did not return valid JSON');
    }
  }

  /** Persist the suggestion for auditing/accuracy analytics, then return it. */
  private async log<T extends { usedFallback: boolean }>(
    feature: AiFeature,
    userId: string | null,
    subjectId: string | null,
    input: Record<string, unknown>,
    output: T,
  ): Promise<T> {
    try {
      await this.suggestions.save(
        this.suggestions.create({
          feature,
          userId,
          subjectId,
          inputContext: input,
          output: output as unknown as Record<string, unknown>,
          usedFallback: output.usedFallback,
          model: output.usedFallback ? null : this.model,
          predictedValue: null,
          actualValue: null,
          accepted: null,
        }),
      );
    } catch (e) {
      this.logger.warn(`Failed to persist AI suggestion: ${(e as Error).message}`);
    }
    return output;
  }

  private nearestNeighbour(
    stops: { id: string; lat?: number | null; lng?: number | null }[],
  ): string[] {
    const geo = stops.filter((s) => s.lat != null && s.lng != null);
    if (geo.length < 2) return stops.map((s) => s.id);
    const remaining = [...stops];
    const route: typeof stops = [remaining.shift()!];
    while (remaining.length) {
      const last = route[route.length - 1];
      let bestIdx = 0;
      let bestDist = Infinity;
      remaining.forEach((s, i) => {
        const d = this.haversine(last, s);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      route.push(remaining.splice(bestIdx, 1)[0]);
    }
    return route.map((s) => s.id);
  }

  private haversine(
    a: { lat?: number | null; lng?: number | null },
    b: { lat?: number | null; lng?: number | null },
  ): number {
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  private coerceConfidence(v: unknown): ConfidenceBand {
    return Object.values(ConfidenceBand).includes(v as ConfidenceBand)
      ? (v as ConfidenceBand)
      : ConfidenceBand.MEDIUM;
  }
  private coerceDefect(v: unknown): DefectCategory | null {
    return Object.values(DefectCategory).includes(v as DefectCategory) ? (v as DefectCategory) : null;
  }
  private coerceSeverity(v: unknown): DefectSeverity | null {
    return Object.values(DefectSeverity).includes(v as DefectSeverity) ? (v as DefectSeverity) : null;
  }
}
