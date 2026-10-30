import { ServiceController } from '@interface-adapters/service/service.controller';

import { ICreateServiceUseCase } from '@application/ports/input/service/create-service.use-case.interface';
import { IFindServiceByIdUseCase } from '@application/ports/input/service/find-service-by-id.use-case.interface';
import { IFindAllServicesPaginatedUseCase } from '@application/ports/input/service/find-all-services-paginated.use-case.interface';
import { IUpdateServiceUseCase } from '@application/ports/input/service/update-service.use-case.interface';

import { ServicePresenter } from '@interface-adapters/service/service.presenter';

import { CreateServiceRequest } from '@interface-adapters/service/requests/create-service-request';
import { UpdateServiceRequest } from '@interface-adapters/service/requests/update-service-request';

import { createMockService } from '../../../helpers/service-mock.factory';

describe('ServiceController', () => {
  let controller: ServiceController;
  let createUseCase: jest.Mocked<ICreateServiceUseCase>;
  let findByIdUseCase: jest.Mocked<IFindServiceByIdUseCase>;
  let findAllPaginatedUseCase: jest.Mocked<IFindAllServicesPaginatedUseCase>;
  let updateUseCase: jest.Mocked<IUpdateServiceUseCase>;

  const createRequestStub: CreateServiceRequest = {
    name: 'Troca de óleo',
    description: 'Troca de óleo com filtro',
    basePrice: 129.9,
    estimatedTimeMin: 60,
  };

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    findAllPaginatedUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };

    controller = new ServiceController(
      createUseCase,
      findByIdUseCase,
      findAllPaginatedUseCase,
      updateUseCase,
    );
  });

  describe('create', () => {
    it('should return service wrapped in data', async () => {
      const created = createMockService(createRequestStub);
      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(createRequestStub);

      expect(result).toEqual(ServicePresenter.toDataResponse(created));
      expect(createUseCase.execute).toHaveBeenCalledWith(createRequestStub);
    });
  });

  describe('findAll', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const services = [createMockService(), createMockService()];
      findAllPaginatedUseCase.execute.mockResolvedValue({
        items: services,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.findAll({ name: 'Troca' });

      expect(result).toEqual(
        ServicePresenter.toPaginatedDataResponse({
          items: services,
          pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
        }),
      );

      expect(findAllPaginatedUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        name: 'Troca',
      });
    });

    it('should forward provided page and limit', async () => {
      findAllPaginatedUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.findAll({ page: 2, limit: 5 });

      expect(findAllPaginatedUseCase.execute).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });
  });

  describe('findById', () => {
    it('should return service wrapped in data', async () => {
      const service = createMockService();
      findByIdUseCase.execute.mockResolvedValue(service);

      const result = await controller.findById(service.id);

      expect(result).toEqual(ServicePresenter.toDataResponse(service));
      expect(findByIdUseCase.execute).toHaveBeenCalledWith(service.id);
    });
  });

  describe('update', () => {
    it('should return updated service wrapped in data', async () => {
      const updateRequest: UpdateServiceRequest = { ...createRequestStub, name: 'Troca premium' };
      const updated = createMockService(updateRequest);

      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(updated.id, updateRequest);

      expect(result).toEqual(ServicePresenter.toDataResponse(updated));
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, updateRequest);
    });
  });
});
