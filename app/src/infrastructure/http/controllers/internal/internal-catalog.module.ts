import { Module } from '@nestjs/common';

import { PartSupplyModule } from '@infrastructure/http/controllers/part-supply/part-supply.module';
import { ServiceModule } from '@infrastructure/http/controllers/service/service.module';

import { InternalCatalogController } from './internal-catalog.controller';

@Module({
  imports: [ServiceModule, PartSupplyModule],
  controllers: [InternalCatalogController],
})
export class InternalCatalogModule {}
