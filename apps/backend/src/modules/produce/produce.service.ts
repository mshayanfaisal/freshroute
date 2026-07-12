import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produce } from './produce.entity';
import { CreateProduceDto } from './dto/create-produce.dto';
import { UpdateProduceDto } from './dto/update-produce.dto';
import {
  DEFAULT_SHELF_LIFE,
  computeSpoilageRisk,
  daysSinceHarvest,
} from './spoilage.util';
import { SpoilageRisk } from '../../common/enums';

export interface ProduceView extends Produce {
  daysSinceHarvest: number;
}

@Injectable()
export class ProduceService {
  constructor(
    @InjectRepository(Produce)
    private readonly repo: Repository<Produce>,
  ) {}

  /** Attach computed days-since-harvest and refresh spoilage risk on the fly. */
  private decorate(p: Produce): ProduceView {
    const risk = computeSpoilageRisk(p.harvestDate, p.shelfLifeDays);
    p.spoilageRisk = risk;
    return Object.assign(p, { daysSinceHarvest: daysSinceHarvest(p.harvestDate) });
  }

  async create(farmerId: string, dto: CreateProduceDto): Promise<ProduceView> {
    const shelfLifeDays = dto.shelfLifeDays ?? DEFAULT_SHELF_LIFE[dto.category] ?? 7;
    const entity = this.repo.create({
      ...dto,
      farmerId,
      shelfLifeDays,
      spoilageRisk: computeSpoilageRisk(dto.harvestDate, shelfLifeDays),
    });
    return this.decorate(await this.repo.save(entity));
  }

  /** Buyer catalogue: everything in stock, high-spoilage items surfaced first. */
  async catalogue(): Promise<ProduceView[]> {
    const items = await this.repo.find({
      where: { isSoldOut: false },
      relations: { farmer: true },
      order: { createdAt: 'DESC' },
    });
    const decorated = items.map((i) => this.decorate(i));
    const rank = { [SpoilageRisk.HIGH]: 0, [SpoilageRisk.MEDIUM]: 1, [SpoilageRisk.LOW]: 2 };
    return decorated.sort((a, b) => rank[a.spoilageRisk] - rank[b.spoilageRisk]);
  }

  async findByFarmer(farmerId: string): Promise<ProduceView[]> {
    const items = await this.repo.find({ where: { farmerId }, order: { createdAt: 'DESC' } });
    return items.map((i) => this.decorate(i));
  }

  async findOne(id: string): Promise<ProduceView> {
    const item = await this.repo.findOne({ where: { id }, relations: { farmer: true } });
    if (!item) throw new NotFoundException('Produce listing not found');
    return this.decorate(item);
  }

  async update(id: string, farmerId: string, dto: UpdateProduceDto): Promise<ProduceView> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Produce listing not found');
    if (item.farmerId !== farmerId) throw new ForbiddenException('Not your listing');

    Object.assign(item, dto);
    if (dto.harvestDate || dto.shelfLifeDays) {
      item.spoilageRisk = computeSpoilageRisk(item.harvestDate, item.shelfLifeDays);
    }
    return this.decorate(await this.repo.save(item));
  }

  async remove(id: string, farmerId: string): Promise<{ success: boolean }> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Produce listing not found');
    if (item.farmerId !== farmerId) throw new ForbiddenException('Not your listing');
    await this.repo.remove(item);
    return { success: true };
  }

  /** All high-risk, in-stock listings — used by the spoilage cron. */
  async highRiskInStock(): Promise<Produce[]> {
    const items = await this.repo.find({ where: { isSoldOut: false } });
    return items.filter(
      (i) => computeSpoilageRisk(i.harvestDate, i.shelfLifeDays) === SpoilageRisk.HIGH,
    );
  }

  /** Recompute + persist spoilage risk for all listings (cron maintenance). */
  async refreshAllRisks(): Promise<number> {
    const items = await this.repo.find();
    for (const i of items) {
      i.spoilageRisk = computeSpoilageRisk(i.harvestDate, i.shelfLifeDays);
    }
    await this.repo.save(items);
    return items.length;
  }
}
