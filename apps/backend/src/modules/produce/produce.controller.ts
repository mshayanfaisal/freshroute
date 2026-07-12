import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProduceService } from './produce.service';
import { CreateProduceDto } from './dto/create-produce.dto';
import { UpdateProduceDto } from './dto/update-produce.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('produce')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('produce')
export class ProduceController {
  constructor(private readonly produce: ProduceService) {}

  @Get('catalogue')
  @ApiOperation({ summary: 'Buyer catalogue — in-stock produce, high spoilage risk first' })
  catalogue() {
    return this.produce.catalogue();
  }

  @Get('mine')
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'A farmer’s own listings' })
  mine(@CurrentUser('id') farmerId: string) {
    return this.produce.findByFarmer(farmerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single listing (with days-since-harvest & spoilage risk)' })
  findOne(@Param('id') id: string) {
    return this.produce.findOne(id);
  }

  @Post()
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Create a produce listing (farmer)' })
  create(@CurrentUser('id') farmerId: string, @Body() dto: CreateProduceDto) {
    return this.produce.create(farmerId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Update a listing / adjust quantity / mark sold out (farmer)' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') farmerId: string,
    @Body() dto: UpdateProduceDto,
  ) {
    return this.produce.update(id, farmerId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Delete a listing (farmer)' })
  remove(@Param('id') id: string, @CurrentUser('id') farmerId: string) {
    return this.produce.remove(id, farmerId);
  }
}
