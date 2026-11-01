import { PartSupplyPresenter } from '@interface-adapters/part-supply/part-supply.presenter';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';

describe('PartSupplyPresenter', () => {
  describe('toResponse', () => {
    it('should map all part/supply fields correctly', () => {
      const partSupply = createMockPartSupply({
        name: 'Correia Dentada',
        sku: 'CD-001',
        stock: 8,
        minStock: 2,
      });

      const response = PartSupplyPresenter.toResponse(partSupply);

      expect(response.id).toBe(partSupply.id);
      expect(response.name).toBe('Correia Dentada');
      expect(response.sku).toBe('CD-001');
      expect(response.stock).toBe(8);
      expect(response.minStock).toBe(2);
      expect(response.createdAt).toBe(partSupply.createdAt);
      expect(response.updatedAt).toBe(partSupply.updatedAt);
    });

    it('should expose reservedStock but not version', () => {
      const partSupply = createMockPartSupply({ stock: 10, reservedStock: 3, version: 2 });

      const response = PartSupplyPresenter.toResponse(partSupply);

      expect(response.reservedStock).toBe(3);
      expect(response.stock).toBe(10);
      expect(response).not.toHaveProperty('version');
    });

    it('should return null description, partNumber and expiresAt when absent', () => {
      const partSupply = createMockPartSupply({
        description: null,
        partNumber: null,
        expiresAt: null,
      });

      const response = PartSupplyPresenter.toResponse(partSupply);

      expect(response.description).toBeNull();
      expect(response.partNumber).toBeNull();
      expect(response.expiresAt).toBeNull();
    });
  });

  describe('toDataResponse', () => {
    it('should wrap the part/supply response in a data property', () => {
      const partSupply = createMockPartSupply();

      const result = PartSupplyPresenter.toDataResponse(partSupply);

      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(partSupply.id);
    });
  });

  describe('toPaginatedDataResponse', () => {
    it('should map items and preserve pagination metadata', () => {
      const items = [createMockPartSupply(), createMockPartSupply()];
      const pagination = { totalRecords: 2, totalPages: 1, page: 1, limit: 10 };

      const result = PartSupplyPresenter.toPaginatedDataResponse({ items, pagination });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(items[0].id);
      expect(result.data[1].id).toBe(items[1].id);
      expect(result.pagination).toEqual(pagination);
    });

    it('should return empty data array when items is empty', () => {
      const result = PartSupplyPresenter.toPaginatedDataResponse({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(0);
    });
  });
});
