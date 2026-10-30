import { PartSupplyController } from '@interface-adapters/part-supply/part-supply.controller';
import { PartSupplyPresenter } from '@interface-adapters/part-supply/part-supply.presenter';
import { CreatePartSupplyRequest } from '@interface-adapters/part-supply/requests/create-part-supply-request';
import { UpdatePartSupplyRequest } from '@interface-adapters/part-supply/requests/update-part-supply-request';
import { UpdateStockRequest } from '@interface-adapters/part-supply/requests/update-stock-request';
import { ICreatePartSupplyUseCase } from '@application/ports/input/part-supply/create-part-supply.use-case.interface';
import { IFindAllPartsSuppliesUseCase } from '@application/ports/input/part-supply/find-all-parts-supplies.use-case.interface';
import { IFindPartSupplyByIdUseCase } from '@application/ports/input/part-supply/find-part-supply-by-id.use-case.interface';
import { IUpdatePartSupplyUseCase } from '@application/ports/input/part-supply/update-part-supply.use-case.interface';
import { IUpdateStockUseCase } from '@application/ports/input/part-supply/update-stock.use-case.interface';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';

describe('PartSupplyController', () => {
  let controller: PartSupplyController;
  let createUseCase: jest.Mocked<ICreatePartSupplyUseCase>;
  let findAllUseCase: jest.Mocked<IFindAllPartsSuppliesUseCase>;
  let findByIdUseCase: jest.Mocked<IFindPartSupplyByIdUseCase>;
  let updateUseCase: jest.Mocked<IUpdatePartSupplyUseCase>;
  let updateStockUseCase: jest.Mocked<IUpdateStockUseCase>;

  const createRequestStub: CreatePartSupplyRequest = {
    name: 'Filtro de Óleo',
    sku: 'FO-001',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25,
    salePrice: 45,
  };

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findAllUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };
    updateStockUseCase = { execute: jest.fn() };

    controller = new PartSupplyController(
      createUseCase,
      findAllUseCase,
      findByIdUseCase,
      updateUseCase,
      updateStockUseCase,
    );
  });

  describe('create', () => {
    it('should return part/supply wrapped in data', async () => {
      const created = createMockPartSupply({
        name: createRequestStub.name,
        sku: createRequestStub.sku,
      });

      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(createRequestStub);

      expect(result).toEqual(PartSupplyPresenter.toDataResponse(created));
      expect(createUseCase.execute).toHaveBeenCalledWith({
        ...createRequestStub,
        expiresAt: undefined,
      });
    });

    it('should convert expiresAt string to Date before calling the use case', async () => {
      const request: CreatePartSupplyRequest = {
        ...createRequestStub,
        sku: 'FF-001',
        expiresAt: '2026-12-31',
      };

      const created = createMockPartSupply({ sku: request.sku });
      createUseCase.execute.mockResolvedValue(created);

      await controller.create(request);

      const callArg = createUseCase.execute.mock.calls[0][0];
      expect(callArg.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const items = [createMockPartSupply(), createMockPartSupply()];

      findAllUseCase.execute.mockResolvedValue({
        items,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.findAll({ name: 'Filtro' });

      expect(result).toEqual(
        PartSupplyPresenter.toPaginatedDataResponse({
          items,
          pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
        }),
      );

      expect(findAllUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10, name: 'Filtro' });
    });

    it('should forward provided page and limit', async () => {
      findAllUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.findAll({ page: 2, limit: 5 });

      expect(findAllUseCase.execute).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });
  });

  describe('findById', () => {
    it('should return part/supply wrapped in data', async () => {
      const partSupply = createMockPartSupply();

      findByIdUseCase.execute.mockResolvedValue(partSupply);

      const result = await controller.findById(partSupply.id);

      expect(result).toEqual(PartSupplyPresenter.toDataResponse(partSupply));
      expect(findByIdUseCase.execute).toHaveBeenCalledWith(partSupply.id);
    });
  });

  describe('update', () => {
    it('should return updated part/supply wrapped in data', async () => {
      const updateRequest: UpdatePartSupplyRequest = {
        ...createRequestStub,
        name: 'Filtro Premium',
      };

      const updated = createMockPartSupply({ name: updateRequest.name });

      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(updated.id, updateRequest);

      expect(result).toEqual(PartSupplyPresenter.toDataResponse(updated));
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, {
        ...updateRequest,
        expiresAt: undefined,
      });
    });

    it('should convert expiresAt string to Date before calling the use case', async () => {
      const updateRequest: UpdatePartSupplyRequest = {
        ...createRequestStub,
        expiresAt: '2026-12-31',
      };

      const updated = createMockPartSupply();
      updateUseCase.execute.mockResolvedValue(updated);

      await controller.update(updated.id, updateRequest);

      const callArg = updateUseCase.execute.mock.calls[0][1];
      expect(callArg.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('updateStock', () => {
    it('should register a stock movement and return the updated part/supply wrapped in data', async () => {
      const request: UpdateStockRequest = {
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Reposição',
      };

      const updated = createMockPartSupply({ stock: 15 });

      updateStockUseCase.execute.mockResolvedValue(updated);

      const result = await controller.updateStock(updated.id, request);

      expect(result).toEqual(PartSupplyPresenter.toDataResponse(updated));
      expect(updateStockUseCase.execute).toHaveBeenCalledWith({
        partSupplyId: updated.id,
        ...request,
      });
    });
  });
});
