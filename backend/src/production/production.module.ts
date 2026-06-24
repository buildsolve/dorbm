import { Module } from '@nestjs/common';
import { ProductionPlanController } from './production-plan.controller';
import { ProductionPlanService } from './production-plan.service';
import { ProductionBatchController } from './production-batch.controller';
import { ProductionBatchService } from './production-batch.service';

@Module({
  controllers: [ProductionPlanController, ProductionBatchController],
  providers: [ProductionPlanService, ProductionBatchService],
  exports: [ProductionPlanService, ProductionBatchService],
})
export class ProductionModule {}
