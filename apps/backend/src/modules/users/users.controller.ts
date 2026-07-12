import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  async me(@CurrentUser('id') id: string) {
    return this.sanitize(await this.users.findById(id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile (address, geo, phone)' })
  async updateMe(@CurrentUser('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.sanitize(await this.users.updateProfile(id, dto));
  }

  @Get('drivers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List drivers (admin) for delivery assignment' })
  async drivers() {
    return (await this.users.findByRole(UserRole.DRIVER)).map((u) => this.sanitize(u));
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all cooperative members (admin)' })
  async list() {
    return (await this.users.listAll()).map((u) => this.sanitize(u));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a member by id (admin)' })
  async byId(@Param('id') id: string) {
    return this.sanitize(await this.users.findById(id));
  }

  /** Strip sensitive fields before returning a user over the wire. */
  private sanitize(u: any) {
    const { passwordHash, refreshTokenHash, ...safe } = u;
    return safe;
  }
}
