import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { StorageLocationController } from './storage-location.controller';
import { StorageLocationService } from './storage-location.service';
import { JournalModule } from '../journal/journal.module';

@Module({
  imports: [JournalModule],
  controllers: [StorageLocationController, StorageController],
  providers: [StorageService, StorageLocationService],
  exports: [StorageService],
})
export class StorageModule {}
