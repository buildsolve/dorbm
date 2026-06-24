import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductionPlanService } from './production-plan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('production/plans')
export class ProductionPlanController {
  constructor(private service: ProductionPlanService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/pick-list')
  @ApiOperation({ summary: 'Get ingredient pick list for plan' })
  getPickList(@Param('id') id: string) {
    return this.service.getPickList(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm production plan' })
  confirm(@Param('id') id: string) {
    return this.service.confirm(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
