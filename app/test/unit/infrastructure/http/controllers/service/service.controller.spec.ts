import { randomUUID } from 'node:crypto';

import { ServiceController } from '@infrastructure/http/controllers/service/service.controller';
import { ServiceController as ServiceCleanController } from '@interface-adapters/service/service.controller';

import { ServicePresenter } from '@interface-adapters/service/service.presenter';

import { CreateServiceRequestDto } from '@infrastructure/http/controllers/service/dto/requests/create-service-request.dto';
import { FindAllServicesQueryDto } from '@infrastructure/http/controllers/service/dto/requests/filter-services.dto';

import { createMockService } from '../../../../../helpers/service-mock.factory';

describe('ServiceController', () => {
  let httpController: ServiceController;
  let cleanController: ServiceCleanController;

  const serviceRequestStub: CreateServiceRequestDto = {
    name: 'Troca de óleo',
    description: 'Troca de óleo com filtro',
    basePrice: 129.9,
    estimatedTimeMin: 60,
  };

  beforeEach(() => {
    cleanController = new ServiceCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new ServiceController(cleanController);
  });

  describe('create', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const response = ServicePresenter.toDataResponse(createMockService());

      jest.spyOn(cleanController, 'create').mockResolvedValue(response);

      const result = await httpController.create(serviceRequestStub);

      expect(result).toBe(response);
      expect(cleanController.create).toHaveBeenCalledWith(serviceRequestStub);
    });
  });

  describe('findAll', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const query: FindAllServicesQueryDto = { page: 1, limit: 10, name: 'Troca' };
      const response = ServicePresenter.toPaginatedDataResponse({
        items: [createMockService()],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      jest.spyOn(cleanController, 'findAll').mockResolvedValue(response);

      const result = await httpController.findAll(query);

      expect(result).toBe(response);
      expect(cleanController.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const service = createMockService();
      const response = ServicePresenter.toDataResponse(service);

      jest.spyOn(cleanController, 'findById').mockResolvedValue(response);

      const result = await httpController.findById(service.id);

      expect(result).toBe(response);
      expect(cleanController.findById).toHaveBeenCalledWith(service.id);
    });
  });

  describe('update', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const response = ServicePresenter.toDataResponse(createMockService({ name: 'Novo nome' }));

      jest.spyOn(cleanController, 'update').mockResolvedValue(response);

      const result = await httpController.update(id, serviceRequestStub);

      expect(result).toBe(response);
      expect(cleanController.update).toHaveBeenCalledWith(id, serviceRequestStub);
    });
  });

  describe('delete', () => {
    it('should delegate to the clean controller', async () => {
      const id = randomUUID();
      jest.spyOn(cleanController, 'delete').mockResolvedValue(undefined);

      await expect(httpController.delete(id)).resolves.toBeUndefined();
      expect(cleanController.delete).toHaveBeenCalledWith(id);
    });
  });
});
