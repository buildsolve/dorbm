import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private service: StorageService) {}

  @Get()
  findAll(@Query('productId') productId?: string, @Query('locationId') locationId?: string) {
    return this.service.findAll({ productId, locationId });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get finished goods stock summary' })
  getSummary() {
    return this.service.getStockSummary();
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get expiring stock alerts' })
  getExpiring(@Query('days') days?: string) {
    return this.service.getExpiringStock(days ? parseInt(days) : 3);
  }

  @Get('fifo/:productId')
  @ApiOperation({ summary: 'Get FIFO/FEFO stock for a product' })
  getFIFO(@Param('productId') productId: string) {
    return this.service.getFIFOStock(productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Post(':id/movement')
  @ApiOperation({ summary: 'Record stock movement (in/out/transfer)' })
  recordMovement(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordMovement(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
