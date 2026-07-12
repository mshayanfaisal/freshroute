import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '../src/common/enums';
import { bearer, createControllerApp, tokenFor } from './utils';

describe('AuthController', () => {
  let app: INestApplication;
  const service = {
    register: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    login: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    refresh: jest.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' }),
    logout: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeAll(async () => {
    app = await createControllerApp(AuthController, [
      { provide: AuthService, useValue: service },
    ]);
  });
  afterAll(async () => app.close());

  it('registers a user (public)', () =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password1', name: 'A', role: UserRole.BUYER })
      .expect(201));

  it('rejects registration with a short password (400)', () =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'x', name: 'A', role: UserRole.BUYER })
      .expect(400));

  it('logs in (public, 200)', () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'password1' })
      .expect(200));

  it('logout requires authentication (401 without token)', () =>
    request(app.getHttpServer()).post('/api/auth/logout').expect(401));

  it('logout succeeds with a token (200)', () =>
    request(app.getHttpServer())
      .post('/api/auth/logout')
      .set(bearer(tokenFor(app, UserRole.BUYER)))
      .expect(200));
});
