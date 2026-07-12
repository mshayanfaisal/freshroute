import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { OrderLine } from '../orders/order-line.entity';
import { Produce } from '../produce/produce.entity';
import { DeliveryStop } from '../deliveries/delivery-stop.entity';
import { AiSuggestion } from '../ai/ai-suggestion.entity';
import {
  AiFeature,
  OrderStatus,
  SpoilageRisk,
  StopStatus,
} from '../../common/enums';
import { computeSpoilageRisk } from '../produce/spoilage.util';

/** Aggregations powering the admin analytics dashboard (≥4 chart types). */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderLine) private readonly lines: Repository<OrderLine>,
    @InjectRepository(Produce) private readonly produce: Repository<Produce>,
    @InjectRepository(DeliveryStop) private readonly stops: Repository<DeliveryStop>,
    @InjectRepository(AiSuggestion) private readonly suggestions: Repository<AiSuggestion>,
  ) {}

  /** Estimated waste rate by category: high-spoilage in-stock units vs total in-stock. */
  async wasteByCategory() {
    const items = await this.produce.find();
    const agg = new Map<string, { total: number; atRisk: number }>();
    for (const i of items) {
      const risk = computeSpoilageRisk(i.harvestDate, i.shelfLifeDays);
      const entry = agg.get(i.category) ?? { total: 0, atRisk: 0 };
      const qty = Number(i.quantityAvailable);
      entry.total += qty;
      if (risk === SpoilageRisk.HIGH) entry.atRisk += qty;
      agg.set(i.category, entry);
    }
    return [...agg.entries()].map(([category, v]) => ({
      category,
      totalUnits: Math.round(v.total),
      atRiskUnits: Math.round(v.atRisk),
      wasteRatePct: v.total ? Math.round((v.atRisk / v.total) * 1000) / 10 : 0,
    }));
  }

  /** Waste rate by farmer (at-risk stock share). */
  async wasteByFarmer() {
    const items = await this.produce.find({ relations: { farmer: true } });
    const agg = new Map<string, { name: string; total: number; atRisk: number }>();
    for (const i of items) {
      const risk = computeSpoilageRisk(i.harvestDate, i.shelfLifeDays);
      const key = i.farmerId;
      const entry = agg.get(key) ?? { name: i.farmer?.orgName || i.farmer?.name || 'Unknown', total: 0, atRisk: 0 };
      const qty = Number(i.quantityAvailable);
      entry.total += qty;
      if (risk === SpoilageRisk.HIGH) entry.atRisk += qty;
      agg.set(key, entry);
    }
    return [...agg.values()]
      .map((v) => ({
        farmer: v.name,
        wasteRatePct: v.total ? Math.round((v.atRisk / v.total) * 1000) / 10 : 0,
        atRiskUnits: Math.round(v.atRisk),
      }))
      .sort((a, b) => b.wasteRatePct - a.wasteRatePct);
  }

  /** Forecast accuracy: compares logged predictions to recorded actuals (MAPE-style). */
  async forecastAccuracy() {
    const rows = await this.suggestions.find({
      where: { feature: AiFeature.DEMAND_FORECAST },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const scored = rows.filter((r) => r.predictedValue != null && r.actualValue != null);
    if (!scored.length) {
      return { samples: 0, meanAbsPctError: null, accuracyPct: null };
    }
    const mape =
      scored.reduce((acc, r) => {
        const p = Number(r.predictedValue);
        const a = Number(r.actualValue) || 1;
        return acc + Math.abs((a - p) / a);
      }, 0) / scored.length;
    return {
      samples: scored.length,
      meanAbsPctError: Math.round(mape * 1000) / 10,
      accuracyPct: Math.round((1 - mape) * 1000) / 10,
    };
  }

  /** Pricing-suggestion acceptance rate (accepted vs total non-fallback suggestions). */
  async pricingAcceptance() {
    const rows = await this.suggestions.find({
      where: { feature: AiFeature.DYNAMIC_PRICING, usedFallback: false },
    });
    const total = rows.length;
    const accepted = rows.filter((r) => r.accepted === true).length;
    return { total, accepted, acceptanceRatePct: total ? Math.round((accepted / total) * 1000) / 10 : 0 };
  }

  /** Top 10 buyers by revenue and order volume (delivered orders). */
  async topBuyers() {
    const rows: { buyer: string; orders: string; revenue: string }[] = await this.orders
      .createQueryBuilder('o')
      .innerJoin('users', 'u', 'u.id = o.buyer_id')
      .select('COALESCE(u.org_name, u.name)', 'buyer')
      .addSelect('COUNT(o.id)', 'orders')
      .addSelect('SUM(o.total_amount)', 'revenue')
      .where('o.status = :s', { s: OrderStatus.DELIVERED })
      .groupBy('buyer')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();
    return rows.map((r) => ({
      buyer: r.buyer,
      orders: Number(r.orders),
      revenue: Math.round(Number(r.revenue) * 100) / 100,
    }));
  }

  /** Driver delivery success rates (delivered vs delivered+failed stops). */
  async driverSuccess() {
    const rows: { driver: string; delivered: string; failed: string }[] = await this.stops
      .createQueryBuilder('s')
      .innerJoin('s.run', 'run')
      .innerJoin('users', 'u', 'u.id = run.driver_id')
      .select('COALESCE(u.name, u.email)', 'driver')
      .addSelect(`SUM(CASE WHEN s.status = :delivered THEN 1 ELSE 0 END)`, 'delivered')
      .addSelect(`SUM(CASE WHEN s.status = :failed THEN 1 ELSE 0 END)`, 'failed')
      .setParameters({ delivered: StopStatus.DELIVERED, failed: StopStatus.FAILED })
      .groupBy('driver')
      .getRawMany();
    return rows.map((r) => {
      const delivered = Number(r.delivered);
      const failed = Number(r.failed);
      const total = delivered + failed;
      return {
        driver: r.driver,
        delivered,
        failed,
        successRatePct: total ? Math.round((delivered / total) * 1000) / 10 : 0,
      };
    });
  }

  /** Headline KPIs for the dashboard top row. */
  async summary() {
    const [orderCount, delivered, disputed] = await Promise.all([
      this.orders.count(),
      this.orders.count({ where: { status: OrderStatus.DELIVERED } }),
      this.orders.count({ where: { status: OrderStatus.DISPUTED } }),
    ]);
    const revenueRow = await this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total_amount),0)', 'sum')
      .where('o.status = :s', { s: OrderStatus.DELIVERED })
      .getRawOne<{ sum: string }>();
    return {
      totalOrders: orderCount,
      deliveredOrders: delivered,
      disputedOrders: disputed,
      revenue: Math.round(Number(revenueRow?.sum ?? 0) * 100) / 100,
    };
  }
}
