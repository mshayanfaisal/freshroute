import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProduceService } from '../produce/produce.service';
import { DeliveryRun } from '../deliveries/delivery-run.entity';
import { RealtimeService, RealtimeEvents } from '../realtime/realtime.service';
import { DeliveryRunStatus, UserRole } from '../../common/enums';

/**
 * Automated background jobs (NestJS @Cron):
 *  1. Hourly spoilage sweep — recompute risk and alert farmers of high-risk stock.
 *  2. Daily 06:00 driver summary — push each driver their day's delivery schedule.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly produce: ProduceService,
    @InjectRepository(DeliveryRun) private readonly runs: Repository<DeliveryRun>,
    private readonly realtime: RealtimeService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'spoilage-sweep' })
  async spoilageSweep(): Promise<void> {
    const refreshed = await this.produce.refreshAllRisks();
    const highRisk = await this.produce.highRiskInStock();
    this.logger.log(`Spoilage sweep: ${refreshed} listings refreshed, ${highRisk.length} high-risk.`);

    // Group high-risk items by farmer and alert each once.
    const byFarmer = new Map<string, { id: string; name: string }[]>();
    for (const item of highRisk) {
      if (!byFarmer.has(item.farmerId)) byFarmer.set(item.farmerId, []);
      byFarmer.get(item.farmerId)!.push({ id: item.id, name: item.name });
    }
    for (const [farmerId, items] of byFarmer) {
      this.realtime.notifyUser(farmerId, RealtimeEvents.SPOILAGE_ALERT, {
        count: items.length,
        items,
        message: `${items.length} of your listings are at high spoilage risk — consider discounting.`,
      });
    }
  }

  @Cron('0 6 * * *', { name: 'driver-daily-summary', timeZone: 'UTC' })
  async driverDailySummary(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const runs = await this.runs.find({
      where: { scheduledDate: today },
    });
    this.logger.log(`Driver summary: ${runs.length} runs scheduled for ${today}.`);

    const byDriver = new Map<string, DeliveryRun[]>();
    for (const run of runs) {
      if (!run.driverId) continue;
      if (!byDriver.has(run.driverId)) byDriver.set(run.driverId, []);
      byDriver.get(run.driverId)!.push(run);
    }
    for (const [driverId, driverRuns] of byDriver) {
      const stops = driverRuns.reduce((n, r) => n + (r.stops?.length ?? 0), 0);
      this.realtime.notifyUser(driverId, RealtimeEvents.DELIVERY_ASSIGNED, {
        summary: true,
        date: today,
        runCount: driverRuns.length,
        stopCount: stops,
        message: `Good morning — you have ${stops} stops across ${driverRuns.length} run(s) today.`,
      });
    }
    // Also nudge admins that the day's schedule went out.
    this.realtime.notifyRole(UserRole.ADMIN, 'scheduler.daily_summary_sent', {
      date: today,
      driversNotified: byDriver.size,
    });
  }

  /** Exposed so an admin can trigger the summary on demand (demo-friendly). */
  async runDriverSummaryNow(): Promise<{ triggered: boolean }> {
    await this.driverDailySummary();
    return { triggered: true };
  }
}
