import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  controllers: [CategoryController, ProductController],
  providers: [ProductService, CategoryService],
  exports: [ProductService],
})
export class ProductModule {}
