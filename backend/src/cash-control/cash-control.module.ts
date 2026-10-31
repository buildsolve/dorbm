import { Module } from '@nestjs/common';
import { MailerModule } from '../common/mailer/mailer.module';
import { CashCountsController } from './cash-counts.controller';
import { CashCountsService } from './cash-counts.service';
import { CashControlSettingsController } from './cash-control-settings.controller';
import { CashControlSettingsService } from './cash-control-settings.service';
import { CashControlAlertCron } from './cash-control-alert.cron';
import { CashDepositsController } from './cash-deposits.controller';
import { CashDepositsService } from './cash-deposits.service';
import { CoinRollController } from './coin-roll.controller';
import { CoinRollService } from './coin-roll.service';

@Module({
  imports: [MailerModule],
  controllers: [CashCountsController, CashControlSettingsController, CashDepositsController, CoinRollController],
  providers: [CashCountsService, CashControlSettingsService, CashControlAlertCron, CashDepositsService, CoinRollService],
})
export class CashControlModule {}
