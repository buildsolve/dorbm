import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductionBatchService } from './production-batch.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('production/batches')
export class ProductionBatchController {
  constructor(private service: ProductionBatchService) {}

  @Get()
  findAll(@Query('planId') planId?: string) {
    return this.service.findAll(planId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start production batch' })
  startBatch(@Param('id') id: string) {
    return this.service.startBatch(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete production batch and record output' })
  completeBatch(@Param('id') id: string, @Body() dto: any) {
    return this.service.completeBatch(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
