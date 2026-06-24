import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private service: ProductService) {}

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const filters: any = {};
    if (categoryId) filters.categoryId = categoryId;
    if (includeInactive === 'true') filters.includeInactive = true;
    else if (isActive !== undefined) filters.isActive = isActive !== 'false';
    return this.service.findAll(filters);
  }

  @Get('top-margin')
  getTopByMargin(@Query('limit') limit?: string) {
    return this.service.getTopByMargin(limit ? parseInt(limit) : 10);
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
