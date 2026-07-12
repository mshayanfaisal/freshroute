import { INestApplication, ValidationPipe, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import configuration from '../src/config/configuration';
import { UserRole } from '../src/common/enums';

// Deterministic secrets for the test JWTs.
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

export interface TestProvider {
  provide: Type<any> | string;
  useValue: any;
}

/**
 * Boot a minimal Nest app around one controller with mocked domain services,
 * but real JwtStrategy + guards — so we exercise authentication & role guards
 * over real HTTP without a database.
 */
export async function createControllerApp(
  controller: Type<any>,
  providers: TestProvider[],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration], ignoreEnvFile: true }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({}),
    ],
    controllers: [controller],
    providers: [JwtStrategy, ...providers],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

/** Sign a valid access token for a given role. */
export function tokenFor(app: INestApplication, role: UserRole, id = 'user-1'): string {
  const jwt = app.get(JwtService);
  return jwt.sign(
    { sub: id, email: `${role}@test.com`, role, name: 'Test', type: 'access' },
    { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '5m' },
  );
}

export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
