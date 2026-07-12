import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

// Load root .env when running the CLI (migrations/seed) outside Nest.
loadEnv({ path: join(__dirname, '../../../../.env') });
loadEnv(); // also allow a local .env

/**
 * Standalone DataSource used by the TypeORM CLI for migrations & seeding.
 * The Nest runtime builds its own DataSource from ConfigService (see DatabaseModule),
 * but both point at the same entities/migrations so schemas never diverge.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'freshroute',
  password: process.env.POSTGRES_PASSWORD ?? 'freshroute_pw',
  database: process.env.POSTGRES_DB ?? 'freshroute',
  entities: [join(__dirname, '../modules/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
