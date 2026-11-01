import { CreatePartSupplyUseCase } from '@application/use-cases/part-supply/create-part-supply.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('CreatePartSupplyUseCase', () => {
  let useCase: CreatePartSupplyUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    useCase = new CreatePartSupplyUseCase(partSupplyRepository);
  });

  const input = {
    name: 'Filtro de Óleo',
    sku: 'FO-001',
    partNumber: 'MANN-W712',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25.0,
    salePrice: 45.0,
  };

  it('should register a Part in Stock successfully', async () => {
    const saved = createMockPartSupply({ id: 'uuid-1', stock: 0, minStock: 0 });
    partSupplyRepository.findBySku.mockResolvedValue(null);
    partSupplyRepository.create.mockResolvedValue(saved);

    const result = await useCase.execute(input);

    expect(partSupplyRepository.findBySku).toHaveBeenCalledWith('FO-001');
    expect(partSupplyRepository.create).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('should register a Supply in Stock successfully', async () => {
    const supplyInput = { ...input, sku: 'OL-001', category: PartSupplyCategory.SUPPLY };
    const saved = createMockPartSupply({
      id: 'uuid-2',
      sku: 'OL-001',
      category: PartSupplyCategory.SUPPLY,
      stock: 0,
      minStock: 0,
    });
    partSupplyRepository.findBySku.mockResolvedValue(null);
    partSupplyRepository.create.mockResolvedValue(saved);

    const result = await useCase.execute(supplyInput);

    expect(result).toEqual(saved);
  });

  it('should throw ResourceConflictException when SKU already exists in Stock', async () => {
    partSupplyRepository.findBySku.mockResolvedValue(createMockPartSupply());

    await expect(useCase.execute(input)).rejects.toThrow(ResourceConflictException);
    expect(partSupplyRepository.create).not.toHaveBeenCalled();
  });
});
