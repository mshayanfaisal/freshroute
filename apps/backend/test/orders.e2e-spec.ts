import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrdersController } from '../src/modules/orders/orders.controller';
import { OrdersService } from '../src/modules/orders/orders.service';
import { OrderStatus, UserRole } from '../src/common/enums';
import { bearer, createControllerApp, tokenFor } from './utils';

describe('OrdersController (role guards + workflow)', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ id: 'o1', reference: 'FR-1' }),
    findForBuyer: jest.fn().mockResolvedValue([]),
    findForFarmer: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
    findConfirmedUnassigned: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'o1' }),
    updateStatus: jest.fn().mockImplementation((id, status) => ({ id, status })),
  };

  beforeAll(async () => {
    app = await createControllerApp(OrdersController, [
      { provide: OrdersService, useValue: service },
    ]);
  });
  afterAll(async () => app.close());

  it('only a buyer may place an order (farmer → 403)', () =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set(bearer(tokenFor(app, UserRole.FARMER)))
      .send({ lines: [{ produceId: '11111111-1111-4111-8111-111111111111', quantity: 1 }] })
      .expect(403));

  it('a buyer can place an order (201)', () =>
    request(app.getHttpServer())
      .post('/api/orders')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .send({ lines: [{ produceId: '11111111-1111-4111-8111-111111111111', quantity: 2 }] })
      .expect(201));

  it('admin can list all orders; buyer cannot (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/orders')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/orders')
      .set(bearer(tokenFor(app, UserRole.ADMIN)))
      .expect(200);
  });

  it('passes the authenticated user through to a status transition', () =>
    request(app.getHttpServer())
      .patch('/api/orders/o1/status')
      .set(bearer(tokenFor(app, UserRole.FARMER, 'farmer-1')))
      .send({ status: OrderStatus.CONFIRMED })
      .expect(200)
      .expect(() =>
        expect(service.updateStatus).toHaveBeenCalledWith(
          'o1',
          OrderStatus.CONFIRMED,
          expect.objectContaining({ id: 'farmer-1', role: UserRole.FARMER }),
        ),
      ));
});
