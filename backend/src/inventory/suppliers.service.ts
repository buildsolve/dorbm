import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.supplier.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: { ingredients: { select: { id: true, name: true, code: true } } },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  async create(dto: any) {
    const exists = await this.prisma.supplier.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Supplier code already exists');
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const hasIngredients = await this.prisma.ingredient.count({ where: { supplierId: id } });
    if (hasIngredients > 0) {
      return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.supplier.delete({ where: { id } });
  }
}
