import { ServicePresenter } from '@interface-adapters/service/service.presenter';
import { createMockService } from '../../../helpers/service-mock.factory';

describe('ServicePresenter', () => {
  describe('toResponse', () => {
    it('should map all service fields correctly', () => {
      const service = createMockService({
        name: 'Alinhamento',
        description: 'Alinhamento e balanceamento',
        basePrice: 149.9,
        estimatedTimeMin: 40,
      });

      const response = ServicePresenter.toResponse(service);

      expect(response.id).toBe(service.id);
      expect(response.name).toBe('Alinhamento');
      expect(response.description).toBe('Alinhamento e balanceamento');
      expect(response.basePrice).toBe(149.9);
      expect(response.estimatedTimeMin).toBe(40);
      expect(response.createdAt).toBe(service.createdAt);
      expect(response.updatedAt).toBe(service.updatedAt);
    });

    it('should return null description when absent', () => {
      const service = createMockService({ description: null });

      const response = ServicePresenter.toResponse(service);

      expect(response.description).toBeNull();
    });
  });

  describe('toDataResponse', () => {
    it('should wrap the service response in a data property', () => {
      const service = createMockService();

      const result = ServicePresenter.toDataResponse(service);

      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(service.id);
      expect(result.data.name).toBe(service.name);
    });
  });

  describe('toPaginatedDataResponse', () => {
    it('should map items and preserve pagination metadata', () => {
      const services = [createMockService(), createMockService()];
      const pagination = { totalRecords: 2, totalPages: 1, page: 1, limit: 10 };

      const result = ServicePresenter.toPaginatedDataResponse({ items: services, pagination });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(services[0].id);
      expect(result.data[1].id).toBe(services[1].id);
      expect(result.pagination).toEqual(pagination);
    });

    it('should return empty data array when items is empty', () => {
      const result = ServicePresenter.toPaginatedDataResponse({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(0);
    });
  });
});
