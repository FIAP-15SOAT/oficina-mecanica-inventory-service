import { randomUUID } from 'node:crypto';
import { FindAllPartsSuppliesUseCase } from '@application/use-cases/part-supply/find-all-parts-supplies.use-case';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('FindAllPartsSuppliesUseCase', () => {
  let useCase: FindAllPartsSuppliesUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    useCase = new FindAllPartsSuppliesUseCase(partSupplyRepository);
  });

  it('should return paginated parts/supplies with correct metadata', async () => {
    const items = [
      createMockPartSupply(),
      createMockPartSupply({ id: randomUUID(), name: 'Óleo Motor 5W30' }),
    ];

    partSupplyRepository.findAllPaginated.mockResolvedValue({ items, total: items.length });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.pagination.totalRecords).toBe(2);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
  });

  it('should calculate total pages correctly when records span multiple pages', async () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      createMockPartSupply({ id: randomUUID(), name: `Peça ${i}` }),
    );

    partSupplyRepository.findAllPaginated.mockResolvedValue({ items, total: 25 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.totalRecords).toBe(25);
  });

  it('should return zero pages when there are no records', async () => {
    partSupplyRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('should forward all filters to the repository', async () => {
    partSupplyRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({
      page: 2,
      limit: 5,
      name: 'Filtro',
      sku: 'FO',
      category: PartSupplyCategory.PART,
      lowStock: true,
    });

    expect(partSupplyRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 2, limit: 5 },
      {
        name: 'Filtro',
        sku: 'FO',
        category: PartSupplyCategory.PART,
        lowStock: true,
      },
    );
  });

  it('should return items from the repository in the result', async () => {
    const items = [createMockPartSupply({ id: randomUUID(), name: 'Pastilha de Freio' })];
    partSupplyRepository.findAllPaginated.mockResolvedValue({ items, total: 1 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toEqual(items);
  });
});
