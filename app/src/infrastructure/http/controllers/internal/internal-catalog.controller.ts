import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Public } from '@infrastructure/http/decorators/public.decorator';
import { INTERNAL_PREFIX } from '@infrastructure/http/http.constants';

import { PartSupplyController as PartSupplyCleanController } from '@interface-adapters/part-supply/part-supply.controller';
import { PartSupplyDataResponse } from '@interface-adapters/part-supply/responses/part-supply.response';
import { ServiceController as ServiceCleanController } from '@interface-adapters/service/service.controller';
import { ServiceDataResponse } from '@interface-adapters/service/responses/service.response';

@ApiExcludeController()
@Public()
@Controller(INTERNAL_PREFIX)
export class InternalCatalogController {
  constructor(
    private readonly serviceController: ServiceCleanController,
    private readonly partSupplyController: PartSupplyCleanController,
  ) {}

  @Get('services/:id')
  findService(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceDataResponse> {
    return this.serviceController.findById(id);
  }

  @Get('parts-supplies/:id')
  findPartSupply(@Param('id', ParseUUIDPipe) id: string): Promise<PartSupplyDataResponse> {
    return this.partSupplyController.findById(id);
  }
}
