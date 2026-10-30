import { randomUUID } from 'node:crypto';

import { PartSupplyController } from '@infrastructure/http/controllers/part-supply/part-supply.controller';

import { PartSupplyController as PartSupplyCleanController } from '@interface-adapters/part-supply/part-supply.controller';
import { PartSupplyPresenter } from '@interface-adapters/part-supply/part-supply.presenter';

import { CreatePartSupplyRequestDto } from '@infrastructure/http/controllers/part-supply/dto/requests/create-part-supply-request.dto';
import { UpdatePartSupplyRequestDto } from '@infrastructure/http/controllers/part-supply/dto/requests/update-part-supply-request.dto';
import { UpdateStockDto } from '@infrastructure/http/controllers/part-supply/dto/requests/update-stock.dto';
import { FindAllPartsSuppliesQueryDto } from '@infrastructure/http/controllers/part-supply/dto/requests/filter-parts-supplies.dto';

import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

import { createMockPartSupply } from '../../../../../helpers/part-supply-mock.factory';

describe('PartSupplyController', () => {
  let httpController: PartSupplyController;
  let cleanController: PartSupplyCleanController;

  const partSupplyRequestStub: CreatePartSupplyRequestDto = {
    name: 'Filtro de Óleo',
    sku: 'FO-001',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25,
    salePrice: 45,
  };

  beforeEach(() => {
    cleanController = new PartSupplyCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new PartSupplyController(cleanController);
  });

  describe('create', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const response = PartSupplyPresenter.toDataResponse(createMockPartSupply());
      jest.spyOn(cleanController, 'create').mockResolvedValue(response);

      const result = await httpController.create(partSupplyRequestStub);

      expect(result).toBe(response);
      expect(cleanController.create).toHaveBeenCalledWith(partSupplyRequestStub);
    });
  });

  describe('findAll', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const query: FindAllPartsSuppliesQueryDto = { page: 1, limit: 10, name: 'Filtro' };

      const response = PartSupplyPresenter.toPaginatedDataResponse({
        items: [createMockPartSupply()],
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
      const partSupply = createMockPartSupply();
      const response = PartSupplyPresenter.toDataResponse(partSupply);

      jest.spyOn(cleanController, 'findById').mockResolvedValue(response);

      const result = await httpController.findById(partSupply.id);

      expect(result).toBe(response);
      expect(cleanController.findById).toHaveBeenCalledWith(partSupply.id);
    });
  });

  describe('update', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const updateRequestStub: UpdatePartSupplyRequestDto = {
        name: 'Filtro Premium',
        sku: 'FO-001',
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 25,
        salePrice: 59.9,
      };

      const response = PartSupplyPresenter.toDataResponse(
        createMockPartSupply({ name: updateRequestStub.name }),
      );

      jest.spyOn(cleanController, 'update').mockResolvedValue(response);

      const result = await httpController.update(id, updateRequestStub);

      expect(result).toBe(response);
      expect(cleanController.update).toHaveBeenCalledWith(id, updateRequestStub);
    });
  });

  describe('updateStock', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();

      const dto: UpdateStockDto = {
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Reposição',
      };

      const response = PartSupplyPresenter.toDataResponse(createMockPartSupply({ stock: 15 }));

      jest.spyOn(cleanController, 'updateStock').mockResolvedValue(response);

      const result = await httpController.updateStock(id, dto);

      expect(result).toBe(response);
      expect(cleanController.updateStock).toHaveBeenCalledWith(id, dto);
    });
  });
});
