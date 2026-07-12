import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DeliveriesController } from '../src/modules/deliveries/deliveries.controller';
import { DeliveriesService } from '../src/modules/deliveries/deliveries.service';
import { ComplaintsController } from '../src/modules/complaints/complaints.controller';
import { ComplaintsService } from '../src/modules/complaints/complaints.service';
import { StopStatus, UserRole } from '../src/common/enums';
import { bearer, createControllerApp, tokenFor } from './utils';

describe('DeliveriesController (role guards)', () => {
  let app: INestApplication;
  const service = {
    createRun: jest.fn().mockResolvedValue({ id: 'run1' }),
    findAllRuns: jest.fn().mockResolvedValue([]),
    findRunsForDriver: jest.fn().mockResolvedValue([]),
    findRun: jest.fn().mockResolvedValue({ id: 'run1', stops: [] }),
    updateStop: jest.fn().mockResolvedValue({ id: 's1', status: StopStatus.DELIVERED }),
    reorderStops: jest.fn().mockResolvedValue({ id: 'run1' }),
  };

  beforeAll(async () => {
    app = await createControllerApp(DeliveriesController, [
      { provide: DeliveriesService, useValue: service },
    ]);
  });
  afterAll(async () => app.close());

  it('only admin creates runs (driver → 403)', () =>
    request(app.getHttpServer())
      .post('/api/deliveries/runs')
      .set(bearer(tokenFor(app, UserRole.DRIVER)))
      .send({ driverId: '11111111-1111-4111-8111-111111111111', scheduledDate: '2026-07-12', orderIds: ['22222222-2222-4222-8222-222222222222'] })
      .expect(403));

  it('admin creates a run (201)', () =>
    request(app.getHttpServer())
      .post('/api/deliveries/runs')
      .set(bearer(tokenFor(app, UserRole.ADMIN)))
      .send({ driverId: '11111111-1111-4111-8111-111111111111', scheduledDate: '2026-07-12', orderIds: ['22222222-2222-4222-8222-222222222222'] })
      .expect(201));

  it('driver sees own runs', () =>
    request(app.getHttpServer())
      .get('/api/deliveries/runs/mine')
      .set(bearer(tokenFor(app, UserRole.DRIVER)))
      .expect(200));

  it('driver marks a stop delivered, admin flag passed correctly', () =>
    request(app.getHttpServer())
      .patch('/api/deliveries/stops/s1')
      .set(bearer(tokenFor(app, UserRole.DRIVER, 'driver-7')))
      .send({ status: StopStatus.DELIVERED })
      .expect(200)
      .expect(() =>
        expect(service.updateStop).toHaveBeenCalledWith('s1', 'driver-7', expect.any(Object), false),
      ));
});

describe('ComplaintsController (role guards)', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ id: 'c1' }),
    findForBuyer: jest.fn().mockResolvedValue([]),
    findForFarmer: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'c1' }),
    updateStatus: jest.fn().mockResolvedValue({ id: 'c1' }),
  };

  beforeAll(async () => {
    app = await createControllerApp(ComplaintsController, [
      { provide: ComplaintsService, useValue: service },
    ]);
  });
  afterAll(async () => app.close());

  it('buyer submits a complaint (201)', () =>
    request(app.getHttpServer())
      .post('/api/complaints')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .send({ orderLineId: '33333333-3333-4333-8333-333333333333', description: 'bruised apples' })
      .expect(201));

  it('farmer cannot submit a complaint (403)', () =>
    request(app.getHttpServer())
      .post('/api/complaints')
      .set(bearer(tokenFor(app, UserRole.FARMER)))
      .send({ orderLineId: '33333333-3333-4333-8333-333333333333', description: 'x is bad' })
      .expect(403));

  it('only admin resolves a complaint (buyer → 403)', () =>
    request(app.getHttpServer())
      .patch('/api/complaints/c1/status')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .send({ status: 'under_review' })
      .expect(403));

  it('admin lists all complaints (200)', () =>
    request(app.getHttpServer())
      .get('/api/complaints')
      .set(bearer(tokenFor(app, UserRole.ADMIN)))
      .expect(200));
});
