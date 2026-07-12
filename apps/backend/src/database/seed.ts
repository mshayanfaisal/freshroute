import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { User } from '../modules/users/user.entity';
import { Produce } from '../modules/produce/produce.entity';
import {
  ProduceCategory,
  UserRole,
} from '../common/enums';
import { computeSpoilageRisk, DEFAULT_SHELF_LIFE } from '../modules/produce/spoilage.util';

/**
 * Idempotent seed. Safe to run repeatedly — it no-ops if the admin already exists.
 * Password for every demo account: "Password1!".
 */
async function seed() {
  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);
  const produce = AppDataSource.getRepository(Produce);

  const existing = await users.findOne({ where: { email: 'admin@greenvalley.coop' } });
  if (existing) {
    console.log('Seed skipped — data already present.');
    await AppDataSource.destroy();
    return;
  }

  const hash = await bcrypt.hash('Password1!', 10);
  const mk = (email: string, name: string, role: UserRole, extra: Partial<User> = {}) =>
    users.create({ email, name, role, passwordHash: hash, isActive: true, ...extra });

  const admin = await users.save(mk('admin@greenvalley.coop', 'Coop Admin', UserRole.ADMIN));

  const farmers = await users.save([
    mk('maria@greenvalley.coop', 'Maria Gonzales', UserRole.FARMER, {
      orgName: 'Sunny Acre Farm', address: '10 Orchard Rd', latitude: 40.71, longitude: -74.0,
    }),
    mk('john@greenvalley.coop', 'John Baker', UserRole.FARMER, {
      orgName: 'Baker Family Dairy', address: '22 Meadow Ln', latitude: 40.73, longitude: -73.99,
    }),
  ]);

  const buyers = await users.save([
    mk('bistro@downtown.com', 'Downtown Bistro', UserRole.BUYER, {
      orgName: 'Downtown Bistro', address: '5 Main St', latitude: 40.72, longitude: -74.01,
    }),
    mk('grocer@corner.com', 'Corner Grocer', UserRole.BUYER, {
      orgName: 'Corner Grocer', address: '88 Elm Ave', latitude: 40.70, longitude: -73.98,
    }),
  ]);

  await users.save([
    mk('dave@greenvalley.coop', 'Dave Driver', UserRole.DRIVER, { latitude: 40.71, longitude: -74.0 }),
    mk('nina@greenvalley.coop', 'Nina Wheels', UserRole.DRIVER, { latitude: 40.72, longitude: -73.99 }),
  ]);

  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);

  const listings: Partial<Produce>[] = [
    { name: 'Tomatoes', variety: 'Roma', category: ProduceCategory.VEGETABLE, unit: 'kg', pricePerUnit: 3.5, quantityAvailable: 120, harvestDate: daysAgo(1), farmerId: farmers[0].id },
    { name: 'Lettuce', variety: 'Romaine', category: ProduceCategory.VEGETABLE, unit: 'head', pricePerUnit: 1.2, quantityAvailable: 80, harvestDate: daysAgo(6), farmerId: farmers[0].id },
    { name: 'Strawberries', variety: 'Albion', category: ProduceCategory.FRUIT, unit: 'punnet', pricePerUnit: 4.0, quantityAvailable: 40, harvestDate: daysAgo(2), farmerId: farmers[0].id },
    { name: 'Whole Milk', category: ProduceCategory.DAIRY, unit: 'litre', pricePerUnit: 1.1, quantityAvailable: 200, harvestDate: daysAgo(3), farmerId: farmers[1].id },
    { name: 'Free-range Eggs', category: ProduceCategory.EGGS, unit: 'dozen', pricePerUnit: 3.2, quantityAvailable: 150, harvestDate: daysAgo(4), farmerId: farmers[1].id },
    { name: 'Basil', category: ProduceCategory.HERBS, unit: 'bunch', pricePerUnit: 2.0, quantityAvailable: 30, harvestDate: daysAgo(4), farmerId: farmers[0].id },
  ];

  await produce.save(
    listings.map((l) => {
      const shelfLifeDays = DEFAULT_SHELF_LIFE[l.category as string] ?? 7;
      return produce.create({
        ...l,
        shelfLifeDays,
        spoilageRisk: computeSpoilageRisk(l.harvestDate as string, shelfLifeDays),
      });
    }),
  );

  console.log('✅ Seed complete.');
  console.log('   Admin:  admin@greenvalley.coop / Password1!');
  console.log('   Farmer: maria@greenvalley.coop / Password1!');
  console.log('   Buyer:  bistro@downtown.com / Password1!');
  console.log('   Driver: dave@greenvalley.coop / Password1!');
  await AppDataSource.destroy();
}

seed().catch(async (e) => {
  console.error('Seed failed:', e);
  try {
    await AppDataSource.destroy();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
