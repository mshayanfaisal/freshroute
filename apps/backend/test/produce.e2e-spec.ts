import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProduceController } from '../src/modules/produce/produce.controller';
import { ProduceService } from '../src/modules/produce/produce.service';
import { UserRole } from '../src/common/enums';
import { bearer, createControllerApp, tokenFor } from './utils';

describe('ProduceController (role guards)', () => {
  let app: INestApplication;
  const service = {
    catalogue: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Tomatoes' }]),
    findByFarmer: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((farmerId, dto) => ({ id: 'p2', farmerId, ...dto })),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    app = await createControllerApp(ProduceController, [
      { provide: ProduceService, useValue: service },
    ]);
  });
  afterAll(async () => app.close());

  it('rejects unauthenticated requests with 401', () =>
    request(app.getHttpServer()).get('/api/produce/catalogue').expect(401));

  it('allows any authenticated role to read the catalogue', () =>
    request(app.getHttpServer())
      .get('/api/produce/catalogue')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .expect(200)
      .expect((r) => expect(r.body[0].name).toBe('Tomatoes')));

  it('forbids a buyer from creating a listing (403)', () =>
    request(app.getHttpServer())
      .post('/api/produce')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .send({
        name: 'X', category: 'vegetable', unit: 'kg', pricePerUnit: 1,
        quantityAvailable: 1, harvestDate: '2026-07-01',
      })
      .expect(403));

  it('lets a farmer create a listing (201)', () =>
    request(app.getHttpServer())
      .post('/api/produce')
      .set(bearer(tokenFor(app, UserRole.FARMER, 'farmer-9')))
      .send({
        name: 'Carrots', category: 'vegetable', unit: 'kg', pricePerUnit: 2,
        quantityAvailable: 50, harvestDate: '2026-07-01',
      })
      .expect(201)
      .expect(() => expect(service.create).toHaveBeenCalledWith('farmer-9', expect.objectContaining({ name: 'Carrots' }))));

  it('rejects an invalid payload with 400 (validation)', () =>
    request(app.getHttpServer())
      .post('/api/produce')
      .set(bearer(tokenFor(app, UserRole.FARMER)))
      .send({ name: 'NoCategory' })
      .expect(400));
});
