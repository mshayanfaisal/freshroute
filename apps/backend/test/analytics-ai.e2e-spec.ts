import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AnalyticsController } from '../src/modules/analytics/analytics.controller';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { AiController } from '../src/modules/ai/ai.controller';
import { AiService } from '../src/modules/ai/ai.service';
import { AiInsightsService } from '../src/modules/ai/ai-insights.service';
import { UserRole } from '../src/common/enums';
import { bearer, createControllerApp, tokenFor } from './utils';

describe('AnalyticsController (admin only)', () => {
  let app: INestApplication;
  const service = {
    summary: jest.fn().mockResolvedValue({ totalOrders: 1 }),
    wasteByCategory: jest.fn().mockResolvedValue([]),
    wasteByFarmer: jest.fn().mockResolvedValue([]),
    forecastAccuracy: jest.fn().mockResolvedValue({ samples: 0 }),
    pricingAcceptance: jest.fn().mockResolvedValue({ total: 0 }),
    topBuyers: jest.fn().mockResolvedValue([]),
    driverSuccess: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    app = await createControllerApp(AnalyticsController, [
      { provide: AnalyticsService, useValue: service },
    ]);
  });
  afterAll(async () => app.close());

  it('blocks a farmer from analytics (403)', () =>
    request(app.getHttpServer())
      .get('/api/analytics/summary')
      .set(bearer(tokenFor(app, UserRole.FARMER)))
      .expect(403));

  it('allows admin (200)', () =>
    request(app.getHttpServer())
      .get('/api/analytics/summary')
      .set(bearer(tokenFor(app, UserRole.ADMIN)))
      .expect(200)
      .expect((r) => expect(r.body.totalOrders).toBe(1)));

  it('exposes top-buyers to admin', () =>
    request(app.getHttpServer())
      .get('/api/analytics/top-buyers')
      .set(bearer(tokenFor(app, UserRole.ADMIN)))
      .expect(200));
});

describe('AiController (proxy role guards)', () => {
  let app: INestApplication;
  const ai = {
    isEnabled: false,
    classifyComplaint: jest.fn().mockResolvedValue({ usedFallback: true }),
    optimiseRoute: jest.fn().mockResolvedValue({ orderedStops: [], usedFallback: true }),
  };
  const insights = {
    demandForecast: jest.fn().mockResolvedValue({ forecasts: [], usedFallback: true }),
    priceSuggestion: jest.fn().mockResolvedValue({ suggestedPrice: null }),
  };

  beforeAll(async () => {
    app = await createControllerApp(AiController, [
      { provide: AiService, useValue: ai },
      { provide: AiInsightsService, useValue: insights },
    ]);
  });
  afterAll(async () => app.close());

  it('status is available to any authenticated role', () =>
    request(app.getHttpServer())
      .get('/api/ai/status')
      .set(bearer(tokenFor(app, UserRole.DRIVER)))
      .expect(200)
      .expect((r) => expect(r.body.enabled).toBe(false)));

  it('forecast is farmer/admin only (buyer → 403)', () =>
    request(app.getHttpServer())
      .get('/api/ai/forecast')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .expect(403));

  it('farmer can request a forecast (200)', () =>
    request(app.getHttpServer())
      .get('/api/ai/forecast')
      .set(bearer(tokenFor(app, UserRole.FARMER)))
      .expect(200));

  it('buyer can classify a complaint (200)', () =>
    request(app.getHttpServer())
      .post('/api/ai/classify-complaint')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .send({ complaintText: 'bruised produce', produceType: 'Apple', daysSinceDelivery: 1 })
      .expect(201));

  it('driver can optimise a route; buyer cannot (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/optimise-route')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .send({ stops: [{ id: 's1', address: 'A' }] })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/ai/optimise-route')
      .set(bearer(tokenFor(app, UserRole.DRIVER)))
      .send({ stops: [{ id: 's1', address: 'A' }] })
      .expect(201);
  });
});
