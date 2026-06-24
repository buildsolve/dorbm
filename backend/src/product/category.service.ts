import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.productCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const c = await this.prisma.productCategory.findUnique({ where: { id }, include: { products: { select: { id: true, name: true } } } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  create(dto: any) {
    return this.prisma.productCategory.create({ data: dto });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.productCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) return this.prisma.productCategory.update({ where: { id }, data: { isActive: false } });
    return this.prisma.productCategory.delete({ where: { id } });
  }
}
