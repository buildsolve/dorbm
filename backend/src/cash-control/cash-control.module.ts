import { Module } from '@nestjs/common';
import { MailerModule } from '../common/mailer/mailer.module';
import { CashCountsController } from './cash-counts.controller';
import { CashCountsService } from './cash-counts.service';
import { CashControlSettingsController } from './cash-control-settings.controller';
import { CashControlSettingsService } from './cash-control-settings.service';
import { CashControlAlertCron } from './cash-control-alert.cron';

@Module({
  imports: [MailerModule],
  controllers: [CashCountsController, CashControlSettingsController],
  providers: [CashCountsService, CashControlSettingsService, CashControlAlertCron],
})
export class CashControlModule {}
