import { randomUUID } from 'node:crypto';
import { FindAllServicesPaginatedUseCase } from '@application/use-cases/service/find-all-services-paginated.use-case';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('FindAllServicesPaginatedUseCase', () => {
  let useCase: FindAllServicesPaginatedUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new FindAllServicesPaginatedUseCase(serviceRepository);
  });

  it('should return paginated services with correct metadata', async () => {
    const services = [
      createMockService(),
      createMockService({ id: randomUUID(), name: 'Tire Rotation' }),
    ];

    serviceRepository.findAllPaginated.mockResolvedValue({
      items: services,
      total: services.length,
    });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.pagination.totalRecords).toBe(services.length);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('should calculate total pages correctly when records span multiple pages', async () => {
    const services = Array.from({ length: 10 }, (_, i) =>
      createMockService({ id: randomUUID(), name: `Service ${i}` }),
    );

    serviceRepository.findAllPaginated.mockResolvedValue({ items: services, total: 25 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.pagination.totalPages).toBe(3); // Math.ceil(25 / 10)
    expect(result.pagination.totalRecords).toBe(25);
  });

  it('should return zero pages when there are no records', async () => {
    serviceRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('should pass undefined to the repository when active is not provided', async () => {
    serviceRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10 });

    expect(serviceRepository.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 }, {});
  });
});
