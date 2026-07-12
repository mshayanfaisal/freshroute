import { SpoilageRisk } from '../../common/enums';

/** Whole days elapsed since a harvest date (never negative). */
export function daysSinceHarvest(harvestDate: string, now = new Date()): number {
  const harvested = new Date(harvestDate).getTime();
  return Math.max(0, Math.floor((now.getTime() - harvested) / 86_400_000));
}

/**
 * Time-based spoilage risk. Uses the fraction of shelf life consumed:
 *   < 50%  → low
 *   50–80% → medium
 *   > 80%  → high (also flagged high once expired)
 */
export function computeSpoilageRisk(
  harvestDate: string,
  shelfLifeDays: number,
  now = new Date(),
): SpoilageRisk {
  if (shelfLifeDays <= 0) return SpoilageRisk.HIGH;
  const consumed = daysSinceHarvest(harvestDate, now) / shelfLifeDays;
  if (consumed > 0.8) return SpoilageRisk.HIGH;
  if (consumed >= 0.5) return SpoilageRisk.MEDIUM;
  return SpoilageRisk.LOW;
}

/** Default shelf life (days) per produce category, used when not supplied. */
export const DEFAULT_SHELF_LIFE: Record<string, number> = {
  vegetable: 7,
  fruit: 10,
  dairy: 14,
  eggs: 28,
  herbs: 5,
};
