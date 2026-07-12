import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppConfig } from '../../config/configuration';
import { User } from '../users/user.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role,
      orgName: dto.orgName ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
    });
    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueSession(user);
  }

  /** Rotate tokens using a valid refresh token, checked against the stored hash. */
  async refresh(refreshToken: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('jwt', { infer: true }).refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.users.findById(payload.sub);
    if (!user.refreshTokenHash) throw new UnauthorizedException('Session revoked');

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Refresh token mismatch');

    return this.issueSession(user);
  }

  async logout(userId: string) {
    await this.users.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  /** Mint an access+refresh pair and persist the refresh hash (rotation). */
  private async issueSession(user: User): Promise<TokenPair & { user: object }> {
    const jwtConf = this.config.get('jwt', { infer: true });
    const base = { sub: user.id, email: user.email, role: user.role, name: user.name };

    const accessToken = await this.jwt.signAsync(
      { ...base, type: 'access' },
      { secret: jwtConf.accessSecret, expiresIn: jwtConf.accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: 'refresh' },
      { secret: jwtConf.refreshSecret, expiresIn: jwtConf.refreshTtl },
    );

    await this.users.setRefreshTokenHash(user.id, await bcrypt.hash(refreshToken, 10));

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgName: user.orgName,
        address: user.address,
      },
    };
  }
}
