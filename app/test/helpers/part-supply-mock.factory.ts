import { randomUUID } from 'node:crypto';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';

export function createMockPartSupply(overrides: Partial<PartSupply> = {}): PartSupply {
  const now = new Date();

  return PartSupply.reconstitute({
    id: randomUUID(),
    name: 'Filtro de Óleo',
    description: null,
    sku: 'FO-001',
    partNumber: 'MANN-W712',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25,
    salePrice: 45,
    stock: 10,
    minStock: 2,
    reservedStock: 0,
    version: 1,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockPartSupplyRepository(): jest.Mocked<IPartSupplyRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findBySku: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
