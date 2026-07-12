import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/resolve-complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('complaints')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post()
  @Roles(UserRole.BUYER)
  @ApiOperation({ summary: 'Submit a quality complaint (AI classifies defect + drafts supplier alert)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateComplaintDto) {
    return this.complaints.create(user, dto);
  }

  @Get('mine')
  @Roles(UserRole.BUYER)
  @ApiOperation({ summary: 'A buyer’s complaints' })
  mine(@CurrentUser('id') buyerId: string) {
    return this.complaints.findForBuyer(buyerId);
  }

  @Get('against-me')
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Complaints raised against a farmer’s produce' })
  againstMe(@CurrentUser('id') farmerId: string) {
    return this.complaints.findForFarmer(farmerId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'All complaints (admin)' })
  all() {
    return this.complaints.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FARMER, UserRole.BUYER)
  @ApiOperation({ summary: 'Get one complaint (full traceability to farm, harvest, delivery)' })
  one(@Param('id') id: string) {
    return this.complaints.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Advance the resolution workflow (admin): under review → resolved' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateComplaintStatusDto) {
    return this.complaints.updateStatus(id, dto);
  }
}
