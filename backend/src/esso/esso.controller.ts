import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EssoService } from './esso.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('esso')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('esso')
export class EssoController {
  constructor(private service: EssoService) {}

  @Get('products')
  getProducts() { return this.service.getProducts(); }

  @Post('simulate')
  simulate(@Body() dto: { productId: string; minVolume: number; maxVolume: number; stepSize: number; costModelId?: string }) {
    return this.service.simulate(dto);
  }

  @Get('cost-models')
  getCostModels() { return this.service.getCostModels(); }

  @Get('cost-models/:id')
  getCostModel(@Param('id') id: string) { return this.service.getCostModel(id); }

  @Put('cost-models/:productId')
  upsertCostModel(@Param('productId') productId: string, @Body() dto: any) {
    return this.service.upsertCostModel(productId, dto);
  }

  @Delete('cost-models/:id')
  deleteCostModel(@Param('id') id: string) { return this.service.deleteCostModel(id); }

  @Get('capacities')
  getCapacities() { return this.service.getCapacities(); }

  @Post('capacities')
  upsertCapacity(@Body() dto: any) { return this.service.upsertCapacity(dto); }

  @Delete('capacities/:id')
  deleteCapacity(@Param('id') id: string) { return this.service.deleteCapacity(id); }

  @Get('scenarios')
  getScenarios() { return this.service.getScenarios(); }

  @Post('scenarios')
  createScenario(@Body() dto: any) { return this.service.createScenario(dto); }

  @Put('scenarios/:id')
  updateScenario(@Param('id') id: string, @Body() dto: any) { return this.service.updateScenario(id, dto); }

  @Delete('scenarios/:id')
  deleteScenario(@Param('id') id: string) { return this.service.deleteScenario(id); }

  @Post('scenarios/:id/run')
  runScenario(@Param('id') id: string) { return this.service.runAndSaveScenario(id); }
}
