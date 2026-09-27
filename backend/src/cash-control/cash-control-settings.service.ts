import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CashControlSettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.cashControlSettings.findFirst();
    if (existing) return existing;
    return this.prisma.cashControlSettings.create({ data: {} });
  }

  async update(dto: {
    alertRecipients?: string;
    allowedEmployeeIds?: string[];
    dailyCutoffTime?: string;
    timezone?: string;
    discrepancyThreshold?: number;
    initialOpeningBalance?: number;
  }) {
    const settings = await this.get();
    return this.prisma.cashControlSettings.update({
      where: { id: settings.id },
      data: {
        ...(dto.alertRecipients !== undefined && { alertRecipients: dto.alertRecipients }),
        ...(dto.allowedEmployeeIds !== undefined && { allowedEmployeeIds: dto.allowedEmployeeIds.join(',') }),
        ...(dto.dailyCutoffTime !== undefined && { dailyCutoffTime: dto.dailyCutoffTime }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.discrepancyThreshold !== undefined && { discrepancyThreshold: Number(dto.discrepancyThreshold) }),
        ...(dto.initialOpeningBalance !== undefined && { initialOpeningBalance: Number(dto.initialOpeningBalance) }),
      },
    });
  }
}
