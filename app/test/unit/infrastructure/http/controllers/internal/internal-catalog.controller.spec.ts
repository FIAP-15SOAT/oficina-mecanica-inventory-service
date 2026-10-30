import { randomUUID } from 'node:crypto';

import { InternalCatalogController } from '@infrastructure/http/controllers/internal/internal-catalog.controller';
import { PartSupplyController as PartSupplyCleanController } from '@interface-adapters/part-supply/part-supply.controller';
import { PartSupplyPresenter } from '@interface-adapters/part-supply/part-supply.presenter';
import { ServiceController as ServiceCleanController } from '@interface-adapters/service/service.controller';
import { ServicePresenter } from '@interface-adapters/service/service.presenter';

import { createMockPartSupply } from '../../../../../helpers/part-supply-mock.factory';
import { createMockService } from '../../../../../helpers/service-mock.factory';

describe('InternalCatalogController', () => {
  let httpController: InternalCatalogController;
  let serviceController: ServiceCleanController;
  let partSupplyController: PartSupplyCleanController;

  beforeEach(() => {
    serviceController = new ServiceCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    partSupplyController = new PartSupplyCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new InternalCatalogController(serviceController, partSupplyController);
  });

  describe('findService', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const response = ServicePresenter.toDataResponse(createMockService());

      jest.spyOn(serviceController, 'findById').mockResolvedValue(response);

      const result = await httpController.findService(id);

      expect(result).toBe(response);
      expect(serviceController.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('findPartSupply', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const response = PartSupplyPresenter.toDataResponse(createMockPartSupply());

      jest.spyOn(partSupplyController, 'findById').mockResolvedValue(response);

      const result = await httpController.findPartSupply(id);

      expect(result).toBe(response);
      expect(partSupplyController.findById).toHaveBeenCalledWith(id);
    });
  });
});
