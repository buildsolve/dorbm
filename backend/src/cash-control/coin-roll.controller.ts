import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CoinRollService } from './coin-roll.service';

@ApiTags('cash-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-control/coin-rolls')
export class CoinRollController {
  constructor(private service: CoinRollService) {}

  @Get('by-date')
  getByDate(@Query('date') date: string) {
    return this.service.getByDate(date);
  }

  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.service.createOrGet(dto, req.user?.sub);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: any) {
    return this.service.patch(id, dto);
  }

  @Post(':id/sign')
  sign(@Param('id') id: string, @Body() dto: any) {
    return this.service.sign(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  list(@Query() query: any) {
    return this.service.list(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
