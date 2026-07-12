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
import { DeliveriesService } from './deliveries.service';
import { CreateRunDto } from './dto/create-run.dto';
import { ReorderStopsDto, UpdateStopDto } from './dto/update-stop.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('deliveries')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Post('runs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a delivery run and assign orders to a driver (admin)' })
  createRun(@Body() dto: CreateRunDto) {
    return this.deliveries.createRun(dto);
  }

  @Get('runs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'All delivery runs (admin)' })
  allRuns() {
    return this.deliveries.findAllRuns();
  }

  @Get('runs/mine')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'A driver’s assigned runs with stops on the map' })
  myRuns(@CurrentUser('id') driverId: string) {
    return this.deliveries.findRunsForDriver(driverId);
  }

  @Get('runs/:id')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a run with its ordered stops' })
  run(@Param('id') id: string) {
    return this.deliveries.findRun(id);
  }

  @Patch('stops/:id')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark a stop delivered/failed — notifies the buyer instantly' })
  updateStop(
    @Param('id') id: string,
    @Body() dto: UpdateStopDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.deliveries.updateStop(id, user.id, dto, user.role === UserRole.ADMIN);
  }

  @Patch('runs/:id/reorder')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Persist a new stop order (e.g. after accepting the AI route)' })
  reorder(
    @Param('id') id: string,
    @Body() dto: ReorderStopsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.deliveries.reorderStops(id, user.id, dto.stopIds, user.role === UserRole.ADMIN);
  }
}
