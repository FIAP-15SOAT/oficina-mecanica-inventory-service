import { ICreateServiceUseCase } from '@application/ports/input/service/create-service.use-case.interface';
import { IFindServiceByIdUseCase } from '@application/ports/input/service/find-service-by-id.use-case.interface';
import { IFindAllServicesPaginatedUseCase } from '@application/ports/input/service/find-all-services-paginated.use-case.interface';
import { IDeleteServiceUseCase } from '@application/ports/input/service/delete-service.use-case.interface';
import { IUpdateServiceUseCase } from '@application/ports/input/service/update-service.use-case.interface';

import { CreateServiceRequest } from './requests/create-service-request';
import { UpdateServiceRequest } from './requests/update-service-request';
import { FindAllServicesQuery } from './requests/find-all-services-query';

import { ServicePresenter } from './service.presenter';
import { ServiceDataResponse, ServicePaginatedResponse } from './responses/service.response';

export class ServiceController {
  constructor(
    private readonly createServiceUseCase: ICreateServiceUseCase,
    private readonly findServiceByIdUseCase: IFindServiceByIdUseCase,
    private readonly findAllServicesPaginatedUseCase: IFindAllServicesPaginatedUseCase,
    private readonly updateServiceUseCase: IUpdateServiceUseCase,
    private readonly deleteServiceUseCase: IDeleteServiceUseCase,
  ) {}

  async create(input: CreateServiceRequest): Promise<ServiceDataResponse> {
    const service = await this.createServiceUseCase.execute(input);
    return ServicePresenter.toDataResponse(service);
  }

  async findAll(query: FindAllServicesQuery): Promise<ServicePaginatedResponse> {
    const result = await this.findAllServicesPaginatedUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return ServicePresenter.toPaginatedDataResponse(result);
  }

  async findById(id: string): Promise<ServiceDataResponse> {
    const service = await this.findServiceByIdUseCase.execute(id);
    return ServicePresenter.toDataResponse(service);
  }

  async update(id: string, input: UpdateServiceRequest): Promise<ServiceDataResponse> {
    const service = await this.updateServiceUseCase.execute(id, input);
    return ServicePresenter.toDataResponse(service);
  }

  async delete(id: string): Promise<void> {
    await this.deleteServiceUseCase.execute(id);
  }
}
