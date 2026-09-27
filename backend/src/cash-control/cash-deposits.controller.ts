import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CashDepositsService } from './cash-deposits.service';

@ApiTags('cash-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-control/deposits')
export class CashDepositsController {
  constructor(private service: CashDepositsService) {}

  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.service.create(dto, req.user?.sub);
  }

  @Get()
  list(@Query() query: any) {
    // Readable by any authenticated user — the entry screen shows recent deposits for context.
    return this.service.list(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
