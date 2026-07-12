import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Headline KPIs' })
  summary() {
    return this.analytics.summary();
  }

  @Get('waste/category')
  @ApiOperation({ summary: 'Weekly waste rate by produce category' })
  wasteCategory() {
    return this.analytics.wasteByCategory();
  }

  @Get('waste/farmer')
  @ApiOperation({ summary: 'Waste rate by farmer' })
  wasteFarmer() {
    return this.analytics.wasteByFarmer();
  }

  @Get('forecast-accuracy')
  @ApiOperation({ summary: 'AI demand-forecast accuracy (predictions vs actuals)' })
  forecast() {
    return this.analytics.forecastAccuracy();
  }

  @Get('pricing-acceptance')
  @ApiOperation({ summary: 'AI pricing-suggestion acceptance rate' })
  pricing() {
    return this.analytics.pricingAcceptance();
  }

  @Get('top-buyers')
  @ApiOperation({ summary: 'Top 10 buyers by volume and revenue' })
  topBuyers() {
    return this.analytics.topBuyers();
  }

  @Get('driver-success')
  @ApiOperation({ summary: 'Driver delivery success rates' })
  driverSuccess() {
    return this.analytics.driverSuccess();
  }
}
