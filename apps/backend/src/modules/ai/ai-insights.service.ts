import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderLine } from '../orders/order-line.entity';
import { Produce } from '../produce/produce.entity';
import { AiService, ForecastResult, PricingResult } from './ai.service';
import { ProduceCategory } from '../../common/enums';

/**
 * Builds AI context from the database and delegates to AiService. Keeps the
 * controllers thin and centralises the SQL aggregation for forecasting/pricing.
 */
@Injectable()
export class AiInsightsService {
  constructor(
    private readonly ai: AiService,
    @InjectRepository(OrderLine)
    private readonly orderLines: Repository<OrderLine>,
    @InjectRepository(Produce)
    private readonly produce: Repository<Produce>,
  ) {}

  /** ISO-ish week of year (1-53) for the current date. */
  private weekOfYear(d = new Date()): number {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = (d.getTime() - start.getTime()) / 86_400_000;
    return Math.ceil((diff + start.getDay() + 1) / 7);
  }

  /**
   * Aggregate the last 8 weeks of ordered quantity per produce category and
   * ask the forecaster to predict next week.
   */
  async demandForecast(userId: string | null): Promise<ForecastResult & { weekOfYear: number }> {
    const rows: { category: ProduceCategory; week: string; volume: string }[] =
      await this.orderLines
        .createQueryBuilder('line')
        .innerJoin('line.order', 'ord')
        .innerJoin('line.produce', 'prod')
        .select('prod.category', 'category')
        .addSelect(`to_char(ord.created_at, 'IYYY-IW')`, 'week')
        .addSelect('SUM(line.quantity_ordered)', 'volume')
        .where(`ord.created_at >= NOW() - INTERVAL '8 weeks'`)
        .groupBy('prod.category')
        .addGroupBy('week')
        .orderBy('week', 'ASC')
        .getRawMany();

    // Pivot into per-category weekly series.
    const byCategory = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!byCategory.has(r.category)) byCategory.set(r.category, new Map());
      byCategory.get(r.category)!.set(r.week, Number(r.volume));
    }
    // Ensure every category appears even with no orders.
    for (const cat of Object.values(ProduceCategory)) {
      if (!byCategory.has(cat)) byCategory.set(cat, new Map());
    }

    const history = [...byCategory.entries()].map(([category, weeks]) => ({
      category,
      weeklyVolumes: [...weeks.values()],
    }));

    const week = this.weekOfYear();
    const result = await this.ai.forecastDemand(userId, week, history);
    return { ...result, weekOfYear: week };
  }

  /** Assemble pricing context for a specific produce listing. */
  async priceSuggestion(userId: string, produceId: string): Promise<PricingResult> {
    const item = await this.produce.findOne({ where: { id: produceId } });
    if (!item) {
      return {
        suggestedPrice: null,
        changePercent: null,
        rationale: 'Listing not found.',
        usedFallback: true,
      };
    }

    const daysSinceHarvest = Math.max(
      0,
      Math.floor((Date.now() - new Date(item.harvestDate).getTime()) / 86_400_000),
    );

    // Last 30 days of sale prices for this produce name (across the cooperative).
    const priceRows: { price: string }[] = await this.orderLines
      .createQueryBuilder('line')
      .innerJoin('line.order', 'ord')
      .select('line.unit_price', 'price')
      .where('LOWER(line.product_name) = LOWER(:name)', { name: item.name })
      .andWhere(`ord.created_at >= NOW() - INTERVAL '30 days'`)
      .getRawMany();
    const recentSalePrices = priceRows.map((p) => Number(p.price)).filter((n) => n > 0);

    // Simple demand signal: units ordered in last 7 days vs stock.
    const demandRow = await this.orderLines
      .createQueryBuilder('line')
      .innerJoin('line.order', 'ord')
      .select('COALESCE(SUM(line.quantity_ordered),0)', 'qty')
      .where('LOWER(line.product_name) = LOWER(:name)', { name: item.name })
      .andWhere(`ord.created_at >= NOW() - INTERVAL '7 days'`)
      .getRawOne<{ qty: string }>();
    const weeklyDemand = Number(demandRow?.qty ?? 0);
    const demandSignal =
      weeklyDemand > Number(item.quantityAvailable)
        ? `strong (demand ${weeklyDemand} > stock ${item.quantityAvailable})`
        : `soft (demand ${weeklyDemand} vs stock ${item.quantityAvailable})`;

    return this.ai.suggestPrice(userId, produceId, {
      productName: item.name,
      unit: item.unit,
      currentPrice: Number(item.pricePerUnit),
      quantityAvailable: Number(item.quantityAvailable),
      daysSinceHarvest,
      shelfLifeDays: item.shelfLifeDays,
      recentSalePrices,
      demandSignal,
    });
  }
}
