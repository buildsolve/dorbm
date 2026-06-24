import { Module } from '@nestjs/common';
import { BuildingCostController } from './building-cost.controller';
import { BuildingCostService } from './building-cost.service';

@Module({
  controllers: [BuildingCostController],
  providers: [BuildingCostService],
  exports: [BuildingCostService],
})
export class BuildingCostModule {}
