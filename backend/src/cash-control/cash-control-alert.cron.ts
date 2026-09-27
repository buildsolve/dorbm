import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { CashControlSettingsService } from './cash-control-settings.service';
import { MailerService } from '../common/mailer/mailer.service';

function getBusinessNow(timezone: string): { dateStr: string; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = map.hour === '24' ? '00' : map.hour;
  return { dateStr: `${map.year}-${map.month}-${map.day}`, hhmm: `${hour}:${map.minute}` };
}

@Injectable()
export class CashControlAlertCron {
  private readonly logger = new Logger(CashControlAlertCron.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: CashControlSettingsService,
    private mailer: MailerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkMissingSubmission() {
    const settings = await this.settingsService.get();
    const { dateStr, hhmm } = getBusinessNow(settings.timezone);

    if (hhmm < settings.dailyCutoffTime) return;

    const alreadyAlertedToday = settings.lastMissingAlertDate?.toISOString().slice(0, 10) === dateStr;
    if (alreadyAlertedToday) return;

    const businessDate = new Date(`${dateStr}T00:00:00.000Z`);
    const submitted = await this.prisma.cashCount.findFirst({
      where: { businessDate, status: 'SUBMITTED' },
    });
    if (submitted) return;

    const recipients = settings.alertRecipients.split(',').map((s) => s.trim()).filter(Boolean);
    this.logger.warn(`No cash count submitted for ${dateStr} past cutoff ${settings.dailyCutoffTime} — alerting ${recipients.length} recipient(s)`);
    await this.mailer.sendMail(
      recipients,
      `Kassenführung: Kein Kassensturz für ${dateStr} eingereicht`,
      `Bis ${settings.dailyCutoffTime} Uhr wurde für den ${dateStr} noch kein Kassensturz eingereicht. Bitte prüfen.`,
    );
    await this.prisma.cashControlSettings.update({
      where: { id: settings.id },
      data: { lastMissingAlertDate: businessDate },
    });
  }
}
