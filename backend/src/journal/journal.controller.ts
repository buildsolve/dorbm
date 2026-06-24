import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JournalService } from './journal.service';

@Controller('journal')
@UseGuards(JwtAuthGuard)
export class JournalController {
  constructor(private journal: JournalService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('productId') productId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.journal.findAll({
      status,
      productId,
      from,
      to,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
