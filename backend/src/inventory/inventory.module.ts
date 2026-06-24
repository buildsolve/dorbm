import { Module } from '@nestjs/common';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { JournalModule } from '../journal/journal.module';

@Module({
  imports: [JournalModule],
  controllers: [IngredientsController, SuppliersController, StockController],
  providers: [IngredientsService, SuppliersService, StockService],
  exports: [IngredientsService],
})
export class InventoryModule {}
