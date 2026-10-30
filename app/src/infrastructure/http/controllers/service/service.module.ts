import { Module } from '@nestjs/common';

import { CreateServiceUseCase } from '@application/use-cases/service/create-service.use-case';
import { UpdateServiceUseCase } from '@application/use-cases/service/update-service.use-case';
import { FindServiceByIdUseCase } from '@application/use-cases/service/find-service-by-id.use-case';
import { FindAllServicesPaginatedUseCase } from '@application/use-cases/service/find-all-services-paginated.use-case';

import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { ICache } from '@application/ports/output/cache.service.interface';

import { ServiceController as ServiceCleanController } from '@interface-adapters/service/service.controller';
import { ServiceController } from './service.controller';

@Module({
  controllers: [ServiceController],
  providers: [
    {
      provide: ServiceCleanController,
      useFactory: (serviceRepository: IServiceRepository, cache: ICache) =>
        new ServiceCleanController(
          new CreateServiceUseCase(serviceRepository, cache),
          new FindServiceByIdUseCase(serviceRepository, cache),
          new FindAllServicesPaginatedUseCase(serviceRepository),
          new UpdateServiceUseCase(serviceRepository, cache),
        ),
      inject: ['IServiceRepository', 'ICache'],
    },
  ],
})
export class ServiceModule {}
