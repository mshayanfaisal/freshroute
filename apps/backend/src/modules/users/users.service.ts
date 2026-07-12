import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.repo.create({ ...data, email: data.email?.toLowerCase() });
    return this.repo.save(user);
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.repo.update({ id: userId }, { refreshTokenHash: hash });
  }

  findByRole(role: UserRole): Promise<User[]> {
    return this.repo.find({ where: { role, isActive: true }, order: { name: 'ASC' } });
  }

  async updateProfile(id: string, data: Partial<User>): Promise<User> {
    await this.repo.update({ id }, data);
    return this.findById(id);
  }

  /** Public directory listing (admins manage members). */
  listAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
}
