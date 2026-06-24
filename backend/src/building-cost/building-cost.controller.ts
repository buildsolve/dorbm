import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuildingCostService } from './building-cost.service';

@ApiTags('building-cost')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('building-cost')
export class BuildingCostController {
  constructor(private service: BuildingCostService) {}

  @Get()    list()                          { return this.service.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Post()   create(@Body() dto: any)        { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
