import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiInsightsService } from './ai-insights.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClassifyComplaintDto } from './dto/classify-complaint.dto';
import { RouteOptimiseDto } from './dto/route-optimise.dto';

/**
 * The mandatory NestJS AI proxy. Every LLM feature is exposed here; the React
 * client calls these authenticated endpoints and never touches an LLM key.
 */
@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly insights: AiInsightsService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Whether the live LLM is available or fallbacks are active' })
  status() {
    return { enabled: this.ai.isEnabled };
  }

  @Get('forecast')
  @Roles(UserRole.FARMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'AI Feature 1 — next-week demand forecast per produce category' })
  forecast(@CurrentUser('id') userId: string) {
    return this.insights.demandForecast(userId);
  }

  @Get('pricing/:produceId')
  @Roles(UserRole.FARMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'AI Feature 2 — dynamic price suggestion for a listing' })
  pricing(@CurrentUser('id') userId: string, @Param('produceId') produceId: string) {
    return this.insights.priceSuggestion(userId, produceId);
  }

  @Post('classify-complaint')
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'AI Feature 3 — classify a complaint & draft a supplier alert' })
  classify(@CurrentUser('id') userId: string, @Body() dto: ClassifyComplaintDto) {
    return this.ai.classifyComplaint(userId, null, dto);
  }

  @Post('optimise-route')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'AI Feature 4 (bonus) — reorder delivery stops to cut distance' })
  optimiseRoute(@CurrentUser('id') userId: string, @Body() dto: RouteOptimiseDto) {
    return this.ai.optimiseRoute(
      userId,
      null,
      dto.stops.map((s) => ({ id: s.id, address: s.address, lat: s.lat ?? null, lng: s.lng ?? null })),
      dto.constraints,
    );
  }
}
