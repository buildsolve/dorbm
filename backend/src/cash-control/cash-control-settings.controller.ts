import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CashControlSettingsService } from './cash-control-settings.service';

@ApiTags('cash-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-control/settings')
export class CashControlSettingsController {
  constructor(private service: CashControlSettingsService) {}

  @Get()
  get() {
    // Readable by any authenticated user — the entry screen needs dailyCutoffTime/allowedEmployeeIds
    // to build its employee picker, not just admins.
    return this.service.get();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch()
  update(@Body() dto: any) {
    return this.service.update(dto);
  }
}
