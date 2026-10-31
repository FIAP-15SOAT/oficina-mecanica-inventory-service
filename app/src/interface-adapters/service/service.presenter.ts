import { Service } from '@domain/entities/service.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  ServiceDataResponse,
  ServicePaginatedResponse,
  ServiceResponse,
} from './responses/service.response';

export class ServicePresenter {
  static toResponse(service: Service): ServiceResponse {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      estimatedTimeMin: service.estimatedTimeMin,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  static toDataResponse(service: Service): ServiceDataResponse {
    return { data: ServicePresenter.toResponse(service) };
  }

  static toPaginatedDataResponse(result: PaginatedResult<Service>): ServicePaginatedResponse {
    return {
      data: result.items.map((s) => ServicePresenter.toResponse(s)),
      pagination: result.pagination,
    };
  }
}
