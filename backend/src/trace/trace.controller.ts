import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TraceService } from './trace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('trace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trace')
export class TraceController {
  constructor(private service: TraceService) {}

  @Get('batch/:id')
  @ApiOperation({ summary: 'Full E2E trace for a storage batch' })
  getBatchTrace(@Param('id') id: string) {
    return this.service.getBatchTrace(id);
  }

  @Get('product/:productId/batches')
  @ApiOperation({ summary: 'All batches for a product' })
  getBatchesForProduct(@Param('productId') productId: string) {
    return this.service.getBatchesForProduct(productId);
  }
}
