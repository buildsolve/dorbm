import { Module } from '@nestjs/common';
import { WeeklyService } from './weekly.service';
import { WeeklyController } from './weekly.controller';
import { JournalModule } from '../journal/journal.module';

@Module({
  imports: [JournalModule],
  providers: [WeeklyService],
  controllers: [WeeklyController],
  exports: [WeeklyService],
})
export class WeeklyModule {}
