import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview KPIs' })
  getOverview() {
    return this.service.getOverview();
  }

  @Get('production-efficiency')
  @ApiOperation({ summary: 'Get production efficiency metrics' })
  getProductionEfficiency() {
    return this.service.getProductionEfficiency();
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top products by margin' })
  getTopProducts() {
    return this.service.getTopProducts();
  }

  @Get('stock-trend')
  @ApiOperation({ summary: 'Get stock movement trend' })
  getStockTrend(@Query('days') days?: string) {
    return this.service.getStockMovementTrend(days ? parseInt(days) : 30);
  }

  @Get('cogs')
  @ApiOperation({ summary: 'Get cost of goods sold' })
  getCOGS(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getCOGS(from, to);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Get material forecast / reorder suggestions' })
  getForecast() {
    return this.service.getForecast();
  }

  @Get('inventory-impact')
  @ApiOperation({ summary: 'Projected inventory reduction from planned production' })
  getInventoryImpact(@Query('window') window?: string) {
    return this.service.getInventoryImpact(this.parseWindow(window, 'month'));
  }

  @Get('operations-kpis')
  @ApiOperation({ summary: 'Operations KPIs: labour, oven/energy, storage utilization' })
  getOperationsKpis(@Query('window') window?: string) {
    return this.service.getOperationsKpis(this.parseWindow(window, 'week'));
  }

  private parseWindow(value: string | undefined, fallback: 'week' | 'month' | 'year'): 'week' | 'month' | 'year' {
    return value === 'week' || value === 'month' || value === 'year' ? value : fallback;
  }

  @Get('business-outlook')
  @ApiOperation({ summary: 'Expected revenue, labour/energy/material cost and profit from planned production' })
  getBusinessOutlook(
    @Query('window') window?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getBusinessOutlook(this.parseWindow(window, 'month'), from, to);
  }

  @Get('strategic-kpis')
  @ApiOperation({ summary: 'Strategic KPIs: portfolio margins, inventory turnover, wastage, dead stock' })
  getStrategicKpis() {
    return this.service.getStrategicKpis();
  }

  @Get('sales-pipeline')
  @ApiOperation({ summary: 'Ready-to-sell finished goods and incoming production pipeline' })
  getSalesPipeline() {
    return this.service.getSalesPipeline();
  }

  @Get('labour-efficiency')
  @ApiOperation({ summary: 'Weekly labour hours vs production output' })
  getLabourEfficiency(@Query('weeks') weeks?: string) {
    return this.service.getLabourEfficiency(weeks ? parseInt(weeks) : 8);
  }

  @Get('annual-plan')
  @ApiOperation({ summary: 'Year-long revenue actual vs 80% target baseline' })
  getAnnualPlan(@Query('year') year?: string) {
    return this.service.getAnnualPlan(year ? parseInt(year) : 2026);
  }

  @Get('sales-history')
  @ApiOperation({ summary: 'What was actually sold (OUT movements), by period' })
  getSalesHistory(@Query('window') window?: string) {
    return this.service.getSalesHistory(this.parseWindow(window, 'month'));
  }
}
