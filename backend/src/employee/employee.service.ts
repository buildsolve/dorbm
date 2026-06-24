import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.employee.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  create(data: { name: string; role?: string; weeklyHours?: number; hourlyRate?: number; notes?: string }) {
    return this.prisma.employee.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: { isActive: false } });
  }
}
