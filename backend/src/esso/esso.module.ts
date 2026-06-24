import { Module } from '@nestjs/common';
import { EssoService } from './esso.service';
import { EssoController } from './esso.controller';

@Module({
  providers: [EssoService],
  controllers: [EssoController],
  exports: [EssoService],
})
export class EssoModule {}
