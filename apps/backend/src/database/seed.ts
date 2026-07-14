import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { User } from '../modules/users/user.entity';
import { Produce } from '../modules/produce/produce.entity';
import { Order } from '../modules/orders/order.entity';
import { OrderLine } from '../modules/orders/order-line.entity';
import { DeliveryRun } from '../modules/deliveries/delivery-run.entity';
import { DeliveryStop } from '../modules/deliveries/delivery-stop.entity';
import { Complaint } from '../modules/complaints/complaint.entity';
import {
  ComplaintStatus,
  DefectCategory,
  DefectSeverity,
  DeliveryRunStatus,
  OrderStatus,
  ProduceCategory,
  StopStatus,
  UserRole,
} from '../common/enums';
import { computeSpoilageRisk, DEFAULT_SHELF_LIFE } from '../modules/produce/spoilage.util';

/**
 * Layered, idempotent seed. Safe to run repeatedly:
 *  - creates any missing demo users / produce (fetch-or-create by natural key)
 *  - if there are no orders yet, builds a full demo flow (orders across statuses,
 *    a delivery run with stops, and a complaint) so every dashboard is populated.
 * Password for every demo account: "Password1!".
 */
async function seed() {
  await AppDataSource.initialize();
  const usersRepo = AppDataSource.getRepository(User);
  const produceRepo = AppDataSource.getRepository(Produce);
  const ordersRepo = AppDataSource.getRepository(Order);
  const runsRepo = AppDataSource.getRepository(DeliveryRun);
  const stopsRepo = AppDataSource.getRepository(DeliveryStop);
  const complaintsRepo = AppDataSource.getRepository(Complaint);

  const hash = await bcrypt.hash('Password1!', 10);
  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);

  // ---- fetch-or-create a user by email ----
  const upsertUser = async (email: string, name: string, role: UserRole, extra: Partial<User> = {}) => {
    const found = await usersRepo.findOne({ where: { email } });
    if (found) return found;
    return usersRepo.save(usersRepo.create({ email, name, role, passwordHash: hash, isActive: true, ...extra }));
  };

  await upsertUser('admin@greenvalley.coop', 'Coop Admin', UserRole.ADMIN);
  const maria = await upsertUser('maria@greenvalley.coop', 'Maria Gonzales', UserRole.FARMER, {
    orgName: 'Sunny Acre Farm', address: '10 Orchard Rd', latitude: 40.71, longitude: -74.0,
  });
  const john = await upsertUser('john@greenvalley.coop', 'John Baker', UserRole.FARMER, {
    orgName: 'Baker Family Dairy', address: '22 Meadow Ln', latitude: 40.73, longitude: -73.99,
  });
  const bistro = await upsertUser('bistro@downtown.com', 'Downtown Bistro', UserRole.BUYER, {
    orgName: 'Downtown Bistro', address: '5 Main St', latitude: 40.72, longitude: -74.01,
  });
  const grocer = await upsertUser('grocer@corner.com', 'Corner Grocer', UserRole.BUYER, {
    orgName: 'Corner Grocer', address: '88 Elm Ave', latitude: 40.70, longitude: -73.98,
  });
  const dave = await upsertUser('dave@greenvalley.coop', 'Dave Driver', UserRole.DRIVER, { latitude: 40.71, longitude: -74.0 });
  await upsertUser('nina@greenvalley.coop', 'Nina Wheels', UserRole.DRIVER, { latitude: 40.72, longitude: -73.99 });

  // ---- ensure produce ----
  if ((await produceRepo.count()) === 0) {
    const listings: Partial<Produce>[] = [
      { name: 'Tomatoes', variety: 'Roma', category: ProduceCategory.VEGETABLE, unit: 'kg', pricePerUnit: 3.5, quantityAvailable: 120, harvestDate: daysAgo(1), farmerId: maria.id },
      { name: 'Lettuce', variety: 'Romaine', category: ProduceCategory.VEGETABLE, unit: 'head', pricePerUnit: 1.2, quantityAvailable: 80, harvestDate: daysAgo(6), farmerId: maria.id },
      { name: 'Strawberries', variety: 'Albion', category: ProduceCategory.FRUIT, unit: 'punnet', pricePerUnit: 4.0, quantityAvailable: 40, harvestDate: daysAgo(2), farmerId: maria.id },
      { name: 'Whole Milk', category: ProduceCategory.DAIRY, unit: 'litre', pricePerUnit: 1.1, quantityAvailable: 200, harvestDate: daysAgo(3), farmerId: john.id },
      { name: 'Free-range Eggs', category: ProduceCategory.EGGS, unit: 'dozen', pricePerUnit: 3.2, quantityAvailable: 150, harvestDate: daysAgo(4), farmerId: john.id },
      { name: 'Basil', category: ProduceCategory.HERBS, unit: 'bunch', pricePerUnit: 2.0, quantityAvailable: 30, harvestDate: daysAgo(4), farmerId: maria.id },
    ];
    await produceRepo.save(
      listings.map((l) => {
        const shelfLifeDays = DEFAULT_SHELF_LIFE[l.category as string] ?? 7;
        return produceRepo.create({
          ...l,
          shelfLifeDays,
          spoilageRisk: computeSpoilageRisk(l.harvestDate as string, shelfLifeDays),
        });
      }),
    );
  }

  // ---- demo flow (only if there are no orders yet) ----
  if ((await ordersRepo.count()) > 0) {
    console.log('Demo flow already present — users/produce ensured, nothing else to add.');
    await printSummary();
    await AppDataSource.destroy();
    return;
  }

  const all = await produceRepo.find();
  const P = (name: string) => all.find((p) => p.name === name)!;

  let seq = 1000;
  const ref = () => `FR-SEED${seq++}`;

  const buildOrder = (
    buyer: User,
    lines: { p: Produce; qty: number }[],
    status: OrderStatus,
    delivered = false,
  ) => {
    const total = lines.reduce((s, l) => s + Number(l.p.pricePerUnit) * l.qty, 0);
    return ordersRepo.create({
      reference: ref(),
      buyerId: buyer.id,
      status,
      totalAmount: Math.round(total * 100) / 100,
      deliveryAddress: buyer.address,
      specialInstructions: null,
      lines: lines.map((l) =>
        AppDataSource.getRepository(OrderLine).create({
          produceId: l.p.id,
          farmerId: l.p.farmerId,
          productName: l.p.name,
          unit: l.p.unit,
          unitPrice: l.p.pricePerUnit,
          quantityOrdered: l.qty,
          quantityDelivered: delivered ? l.qty : 0,
          harvestDate: l.p.harvestDate,
        }),
      ),
    });
  };

  // A delivered order (bistro ← Maria), an in-transit order (grocer ← John),
  // a confirmed order (bistro ← John dairy), and a pending order (grocer ← Maria).
  const oDelivered = await ordersRepo.save(
    buildOrder(bistro, [{ p: P('Tomatoes'), qty: 20 }, { p: P('Lettuce'), qty: 15 }], OrderStatus.DELIVERED, true),
  );
  const oTransit = await ordersRepo.save(
    buildOrder(grocer, [{ p: P('Free-range Eggs'), qty: 30 }, { p: P('Whole Milk'), qty: 40 }], OrderStatus.IN_TRANSIT),
  );
  await ordersRepo.save(
    buildOrder(bistro, [{ p: P('Whole Milk'), qty: 25 }], OrderStatus.CONFIRMED),
  );
  await ordersRepo.save(
    buildOrder(grocer, [{ p: P('Strawberries'), qty: 10 }, { p: P('Basil'), qty: 8 }], OrderStatus.PENDING),
  );

  // A delivery run for Dave containing both the delivered + in-transit stops.
  const run = await runsRepo.save(
    runsRepo.create({ driverId: dave.id, scheduledDate: daysAgo(0), status: DeliveryRunStatus.IN_PROGRESS, stops: [] }),
  );
  await stopsRepo.save([
    stopsRepo.create({
      runId: run.id, orderId: oDelivered.id, sequence: 1, address: bistro.address!,
      latitude: bistro.latitude, longitude: bistro.longitude,
      specialInstructions: 'Leave at rear entrance.', status: StopStatus.DELIVERED, completedAt: new Date(),
    }),
    stopsRepo.create({
      runId: run.id, orderId: oTransit.id, sequence: 2, address: grocer.address!,
      latitude: grocer.latitude, longitude: grocer.longitude,
      specialInstructions: 'Call on arrival.', status: StopStatus.PENDING, completedAt: null,
    }),
  ]);

  // A quality complaint on the delivered order's first line.
  const deliveredLine = oDelivered.lines[0];
  await complaintsRepo.save(
    complaintsRepo.create({
      buyerId: bistro.id,
      orderLineId: deliveredLine.id,
      farmerId: deliveredLine.farmerId,
      description: 'A few of the tomatoes were bruised on arrival.',
      status: ComplaintStatus.SUBMITTED,
      defectCategory: DefectCategory.FRESHNESS,
      severity: DefectSeverity.MINOR,
      supplierAlertDraft: 'Minor freshness issue reported on a tomato delivery — please review packing.',
      aiClassified: false,
    }),
  );

  console.log('✅ Seed complete (users, produce, demo orders, delivery run, complaint).');
  await printSummary();
  await AppDataSource.destroy();

  async function printSummary() {
    const [u, p, o, r, c] = await Promise.all([
      usersRepo.count(), produceRepo.count(), ordersRepo.count(), runsRepo.count(), complaintsRepo.count(),
    ]);
    console.log(`   Rows → users:${u} produce:${p} orders:${o} runs:${r} complaints:${c}`);
    console.log('   Admin: admin@greenvalley.coop | Farmer: maria@greenvalley.coop | Buyer: bistro@downtown.com | Driver: dave@greenvalley.coop  (Password1!)');
  }
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
