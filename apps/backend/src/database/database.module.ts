import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppConfig } from '../config/configuration';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const db = config.get('db', { infer: true });
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          entities: [join(__dirname, '../modules/**/*.entity.{ts,js}')],
          migrations: [join(__dirname, './migrations/*.{ts,js}')],
          // Migrations own the schema. Never synchronize in any environment.
          synchronize: false,
          migrationsRun: false,
          logging: config.get('nodeEnv', { infer: true }) === 'development',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
