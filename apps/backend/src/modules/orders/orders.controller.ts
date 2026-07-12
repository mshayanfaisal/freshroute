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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Roles(UserRole.BUYER)
  @ApiOperation({ summary: 'Place an order with line items from one or more farmers (buyer)' })
  create(@CurrentUser('id') buyerId: string, @Body() dto: CreateOrderDto) {
    return this.orders.create(buyerId, dto);
  }

  @Get('mine')
  @Roles(UserRole.BUYER)
  @ApiOperation({ summary: 'A buyer’s orders' })
  mine(@CurrentUser('id') buyerId: string) {
    return this.orders.findForBuyer(buyerId);
  }

  @Get('incoming')
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Orders containing a farmer’s produce' })
  incoming(@CurrentUser('id') farmerId: string) {
    return this.orders.findForFarmer(farmerId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'All orders (admin)' })
  all() {
    return this.orders.findAll();
  }

  @Get('assignable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirmed/packed orders available to assign to a delivery run (admin)' })
  assignable() {
    return this.orders.findConfirmedUnassigned();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one order with its line items' })
  one(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.FARMER, UserRole.BUYER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Advance an order through its role-guarded status workflow' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.updateStatus(id, dto.status, user);
  }
}
