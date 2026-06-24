import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/stock')
export class StockController {
  constructor(private service: StockService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'List stock transactions' })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock() {
    return this.service.getLowStockAlerts();
  }

  @Get('transactions/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('stock-in')
  @ApiOperation({ summary: 'Record stock receipt' })
  stockIn(@Body() dto: any) {
    return this.service.stockIn(dto);
  }

  @Post('stock-out')
  @ApiOperation({ summary: 'Record stock issue' })
  stockOut(@Body() dto: any) {
    return this.service.stockOut(dto);
  }

  @Post('wastage')
  @ApiOperation({ summary: 'Record wastage or spoilage' })
  recordWastage(@Body() dto: any) {
    return this.service.recordWastage(dto);
  }
}
