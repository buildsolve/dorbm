import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class StorageLocationService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.storageLocation.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const l = await this.prisma.storageLocation.findUnique({ where: { id }, include: { storageRecords: { where: { isActive: true } } } });
    if (!l) throw new NotFoundException('Storage location not found');
    return l;
  }

  create(dto: any) { return this.prisma.storageLocation.create({ data: dto }); }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.storageLocation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const count = await this.prisma.storageRecord.count({ where: { locationId: id, isActive: true } });
    if (count > 0) return this.prisma.storageLocation.update({ where: { id }, data: { isActive: false } });
    return this.prisma.storageLocation.delete({ where: { id } });
  }
}
