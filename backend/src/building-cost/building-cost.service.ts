import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class BuildingCostService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.buildingCost.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async get(id: string) {
    const item = await this.prisma.buildingCost.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`BuildingCost ${id} not found`);
    return item;
  }

  create(dto: any) {
    const { name, sqm, rentPerSqm, isActive, notes } = dto;
    return this.prisma.buildingCost.create({
      data: { name, sqm: Number(sqm), rentPerSqm: Number(rentPerSqm), isActive: isActive ?? true, notes: notes ?? null },
    });
  }

  async update(id: string, dto: any) {
    await this.get(id);
    const { name, sqm, rentPerSqm, isActive, notes } = dto;
    return this.prisma.buildingCost.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sqm !== undefined && { sqm: Number(sqm) }),
        ...(rentPerSqm !== undefined && { rentPerSqm: Number(rentPerSqm) }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes: notes ?? null }),
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.buildingCost.delete({ where: { id } });
  }
}
