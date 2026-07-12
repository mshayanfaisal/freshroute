import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { SchedulerController } from '../src/modules/scheduler/scheduler.controller';
import { SchedulerService } from '../src/modules/scheduler/scheduler.service';
import { UserRole } from '../src/common/enums';
import { bearer, createControllerApp, tokenFor } from './utils';

describe('UsersController (role guards)', () => {
  let app: INestApplication;
  const service = {
    findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'A', role: UserRole.BUYER, passwordHash: 'secret', refreshTokenHash: 'secret' }),
    updateProfile: jest.fn().mockResolvedValue({ id: 'u1', name: 'New' }),
    findByRole: jest.fn().mockResolvedValue([]),
    listAll: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    app = await createControllerApp(UsersController, [{ provide: UsersService, useValue: service }]);
  });
  afterAll(async () => app.close());

  it('me returns the sanitized profile (no password/refresh hashes)', () =>
    request(app.getHttpServer())
      .get('/api/users/me')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .expect(200)
      .expect((r) => {
        expect(r.body.passwordHash).toBeUndefined();
        expect(r.body.refreshTokenHash).toBeUndefined();
        expect(r.body.email).toBe('a@b.com');
      }));

  it('non-admin cannot list all members (403)', () =>
    request(app.getHttpServer())
      .get('/api/users')
      .set(bearer(tokenFor(app, UserRole.FARMER)))
      .expect(403));

  it('admin can list drivers (200)', () =>
    request(app.getHttpServer())
      .get('/api/users/drivers')
      .set(bearer(tokenFor(app, UserRole.ADMIN)))
      .expect(200));
});

describe('SchedulerController (admin only)', () => {
  let app: INestApplication;
  const service = { runDriverSummaryNow: jest.fn().mockResolvedValue({ triggered: true }) };

  beforeAll(async () => {
    app = await createControllerApp(SchedulerController, [{ provide: SchedulerService, useValue: service }]);
  });
  afterAll(async () => app.close());

  it('driver cannot trigger the summary (403)', () =>
    request(app.getHttpServer())
      .post('/api/scheduler/driver-summary/run')
      .set(bearer(tokenFor(app, UserRole.DRIVER)))
      .expect(403));

  it('admin triggers the summary (201)', () =>
    request(app.getHttpServer())
      .post('/api/scheduler/driver-summary/run')
      .set(bearer(tokenFor(app, UserRole.ADMIN)))
      .expect(201)
      .expect((r) => expect(r.body.triggered).toBe(true)));
});
