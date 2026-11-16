import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CashCountsService } from './cash-counts.service';

@ApiTags('cash-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-control/counts')
export class CashCountsController {
  constructor(private service: CashCountsService) {}

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

  @Post(':id/withdrawals')
  addWithdrawal(@Param('id') id: string, @Body() dto: any) {
    return this.service.addWithdrawal(id, dto);
  }

  @Delete(':id/withdrawals/:withdrawalId')
  removeWithdrawal(@Param('id') id: string, @Param('withdrawalId') withdrawalId: string) {
    return this.service.removeWithdrawal(id, withdrawalId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
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
  @Get('summary')
  summary(@Query() query: any) {
    return this.service.summary(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
