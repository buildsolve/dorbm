import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { RecipeModule } from './recipe/recipe.module';
import { ProductModule } from './product/product.module';
import { ProductionModule } from './production/production.module';
import { StorageModule } from './storage/storage.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EssoModule } from './esso/esso.module';
import { WeeklyModule } from './weekly/weekly.module';
import { EmployeeModule } from './employee/employee.module';
import { EquipmentModule } from './equipment/equipment.module';
import { BuildingCostModule } from './building-cost/building-cost.module';
import { TraceModule } from './trace/trace.module';
import { JournalModule } from './journal/journal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    InventoryModule,
    RecipeModule,
    ProductModule,
    ProductionModule,
    StorageModule,
    DashboardModule,
    EssoModule,
    WeeklyModule,
    EmployeeModule,
    EquipmentModule,
    BuildingCostModule,
    TraceModule,
    JournalModule,
  ],
})
export class AppModule {}
