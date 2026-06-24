import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  list(includeInactive = false) {
    return this.prisma.equipment.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async get(id: string) {
    const item = await this.prisma.equipment.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Equipment ${id} not found`);
    return item;
  }

  create(dto: any) {
    const { type, name, size, quantity, powerKw, notes, isActive } = dto;
    return this.prisma.equipment.create({
      data: { type, name, size: size ?? null, quantity: quantity ?? 1, powerKw: powerKw ?? null, notes: notes ?? null, isActive: isActive ?? true },
    });
  }

  async update(id: string, dto: any) {
    await this.get(id);
    const { type, name, size, quantity, powerKw, notes, isActive } = dto;
    return this.prisma.equipment.update({
      where: { id },
      data: { type, name, size, quantity, powerKw: powerKw ?? null, notes, isActive },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.equipment.delete({ where: { id } });
  }
}
