import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }
  }

  async sendMail(to: string[], subject: string, text: string) {
    if (!to.length) {
      this.logger.warn(`No recipients configured, skipping email: ${subject}`);
      return;
    }
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured — would have sent to [${to.join(', ')}]: ${subject}\n${text}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'cakeerp@localhost',
      to: to.join(','),
      subject,
      text,
    });
  }
}
