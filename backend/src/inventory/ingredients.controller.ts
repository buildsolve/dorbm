import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/ingredients')
export class IngredientsController {
  constructor(private service: IngredientsService) {}

  @Get()
  @ApiOperation({ summary: 'List all ingredients' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get inventory valuation' })
  getValuation() {
    return this.service.getValuation();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ingredient by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create ingredient' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ingredient' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/deactivate ingredient' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
