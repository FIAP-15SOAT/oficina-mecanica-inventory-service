import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { Unit } from '@domain/enums/unit.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

describe('PartSupply Entity', () => {
  const validProps = {
    name: 'Filtro de Óleo',
    sku: 'FO-001',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25.0,
    salePrice: 45.0,
  };

  describe('create (factory method)', () => {
    describe('when valid', () => {
      it('should create a part/supply with required fields and defaults', () => {
        const partSupply = PartSupply.create(validProps);

        expect(partSupply.name).toBe('Filtro de Óleo');
        expect(partSupply.sku).toBe('FO-001');
        expect(partSupply.category).toBe(PartSupplyCategory.PART);
        expect(partSupply.unit).toBe(Unit.UN);
        expect(partSupply.costPrice).toBe(25.0);
        expect(partSupply.salePrice).toBe(45.0);
        expect(partSupply.stock).toBe(0);
        expect(partSupply.minStock).toBe(0);

        expect(partSupply.id).toBeDefined();
        expect(partSupply.createdAt).toBeInstanceOf(Date);
        expect(partSupply.updatedAt).toBeInstanceOf(Date);
      });

      it('should accept all optional fields', () => {
        const expiresAt = new Date('2027-12-31');
        const partSupply = PartSupply.create({
          ...validProps,
          description: 'Filtro para motor 1.0',
          partNumber: 'MANN-W712',
          stock: 10,
          minStock: 2,
          expiresAt,
        });

        expect(partSupply.description).toBe('Filtro para motor 1.0');
        expect(partSupply.partNumber).toBe('MANN-W712');
        expect(partSupply.stock).toBe(10);
        expect(partSupply.minStock).toBe(2);
        expect(partSupply.expiresAt).toBe(expiresAt);
      });

      it('should trim name and sku', () => {
        const partSupply = PartSupply.create({
          ...validProps,
          name: '  Filtro de Óleo  ',
          sku: '  FO-001  ',
        });

        expect(partSupply.name).toBe('Filtro de Óleo');
        expect(partSupply.sku).toBe('FO-001');
      });

      it('should trim optional string fields', () => {
        const partSupply = PartSupply.create({
          ...validProps,
          description: '  Filtro para motor  ',
          partNumber: '  MANN-W712  ',
        });

        expect(partSupply.description).toBe('Filtro para motor');
        expect(partSupply.partNumber).toBe('MANN-W712');
      });

      it('should set description to undefined when not provided', () => {
        const partSupply = PartSupply.create(validProps);

        expect(partSupply.description).toBeNull();
      });
    });

    describe('name validation', () => {
      it('should throw when name is empty', () => {
        expect(() => PartSupply.create({ ...validProps, name: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => PartSupply.create({ ...validProps, name: '' })).toThrow('Nome é obrigatório');
      });

      it('should throw when name is too short', () => {
        expect(() => PartSupply.create({ ...validProps, name: 'AB' })).toThrow(
          'Nome deve ter no mínimo 3 caracteres',
        );
      });

      it('should throw when name is too long', () => {
        const longName = 'A'.repeat(151);
        expect(() => PartSupply.create({ ...validProps, name: longName })).toThrow(
          'Nome deve ter no máximo 150 caracteres',
        );
      });
    });

    describe('sku validation', () => {
      it('should throw when sku is empty', () => {
        expect(() => PartSupply.create({ ...validProps, sku: '' })).toThrow('SKU é obrigatório');
      });

      it('should throw when sku exceeds max length', () => {
        const longSku = 'A'.repeat(61);
        expect(() => PartSupply.create({ ...validProps, sku: longSku })).toThrow(
          'SKU deve ter no máximo 60 caracteres',
        );
      });
    });

    describe('partNumber validation', () => {
      it('should throw when partNumber exceeds max length', () => {
        const longPartNumber = 'A'.repeat(61);
        expect(() => PartSupply.create({ ...validProps, partNumber: longPartNumber })).toThrow(
          'Número de referência deve ter no máximo 60 caracteres',
        );
      });

      it('should accept undefined partNumber without error', () => {
        expect(() => PartSupply.create({ ...validProps, partNumber: undefined })).not.toThrow();
      });
    });

    describe('description validation', () => {
      it('should throw when description exceeds max length', () => {
        const longDescription = 'A'.repeat(501);
        expect(() => PartSupply.create({ ...validProps, description: longDescription })).toThrow(
          'Descrição deve ter no máximo 500 caracteres',
        );
      });
    });

    describe('costPrice validation', () => {
      it('should throw when costPrice is zero', () => {
        expect(() => PartSupply.create({ ...validProps, costPrice: 0 })).toThrow(
          'Preço de custo deve ser maior que zero',
        );
      });

      it('should throw when costPrice is negative', () => {
        expect(() => PartSupply.create({ ...validProps, costPrice: -1 })).toThrow(
          'Preço de custo deve ser maior que zero',
        );
      });

      it('should throw when costPrice is not finite', () => {
        expect(() => PartSupply.create({ ...validProps, costPrice: Infinity })).toThrow(
          'Preço de custo inválido',
        );
      });
    });

    describe('salePrice validation', () => {
      it('should throw when salePrice is zero', () => {
        expect(() => PartSupply.create({ ...validProps, salePrice: 0 })).toThrow(
          'Preço de venda deve ser maior que zero',
        );
      });

      it('should throw when salePrice is negative', () => {
        expect(() => PartSupply.create({ ...validProps, salePrice: -5 })).toThrow(
          'Preço de venda deve ser maior que zero',
        );
      });

      it('should throw when salePrice is NaN', () => {
        expect(() => PartSupply.create({ ...validProps, salePrice: NaN })).toThrow(
          'Preço de venda inválido',
        );
      });
    });

    describe('stock validation', () => {
      it('should throw when stock is not an integer', () => {
        expect(() => PartSupply.create({ ...validProps, stock: 1.5 })).toThrow(
          'Estoque deve ser um número inteiro',
        );
      });

      it('should throw when stock is negative', () => {
        expect(() => PartSupply.create({ ...validProps, stock: -1 })).toThrow(
          'Estoque não pode ser negativo',
        );
      });

      it('should accept stock of zero', () => {
        expect(() => PartSupply.create({ ...validProps, stock: 0 })).not.toThrow();
      });
    });

    describe('minStock validation', () => {
      it('should throw when minStock is not an integer', () => {
        expect(() => PartSupply.create({ ...validProps, minStock: 0.5 })).toThrow(
          'Estoque mínimo deve ser um número inteiro',
        );
      });

      it('should throw when minStock is negative', () => {
        expect(() => PartSupply.create({ ...validProps, minStock: -1 })).toThrow(
          'Estoque mínimo não pode ser negativo',
        );
      });
    });
    describe('expiresAt validation', () => {
      it('should throw when expiresAt is in the past (validateExpiresAt)', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        expect(() => PartSupply.create({ ...validProps, expiresAt: pastDate })).toThrow(
          DomainValidationException,
        );
      });

      it('should not throw when expiresAt is today', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        expect(() => PartSupply.create({ ...validProps, expiresAt: today })).not.toThrow();
      });

      it('should not throw when expiresAt is in the future', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        expect(() => PartSupply.create({ ...validProps, expiresAt: futureDate })).not.toThrow();
      });
    });
  });

  describe('update()', () => {
    it('should update mutable fields', () => {
      const partSupply = PartSupply.create({ ...validProps, stock: 5, minStock: 1 });
      const expiresAt = new Date('2027-06-01');

      partSupply.update({
        name: 'Filtro de Ar',
        sku: 'FA-002',
        category: PartSupplyCategory.SUPPLY,
        unit: Unit.UN,
        costPrice: 15,
        salePrice: 30,
        description: 'Filtro para motor',
        partNumber: 'BOSCH-123',
        minStock: 3,
        expiresAt,
      });

      expect(partSupply.name).toBe('Filtro de Ar');
      expect(partSupply.sku).toBe('FA-002');
      expect(partSupply.category).toBe(PartSupplyCategory.SUPPLY);
      expect(partSupply.costPrice).toBe(15);
      expect(partSupply.salePrice).toBe(30);
      expect(partSupply.description).toBe('Filtro para motor');
      expect(partSupply.partNumber).toBe('BOSCH-123');
      expect(partSupply.minStock).toBe(3);
      expect(partSupply.expiresAt).toBe(expiresAt);
      expect(partSupply.stock).toBe(5);
    });

    it('should not change stock when updated', () => {
      const partSupply = PartSupply.create({ ...validProps, stock: 7 });

      partSupply.update({ ...validProps, name: 'Outro Nome' });

      expect(partSupply.stock).toBe(7);
    });

    it('should trim name and sku on update', () => {
      const partSupply = PartSupply.create(validProps);

      partSupply.update({ ...validProps, name: '  Novo Nome  ', sku: '  NS-001  ' });

      expect(partSupply.name).toBe('Novo Nome');
      expect(partSupply.sku).toBe('NS-001');
    });

    it('should throw DomainValidationException when name is invalid on update', () => {
      const partSupply = PartSupply.create(validProps);

      expect(() => partSupply.update({ ...validProps, name: '' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw DomainValidationException when costPrice is invalid on update', () => {
      const partSupply = PartSupply.create(validProps);

      expect(() => partSupply.update({ ...validProps, costPrice: 0 })).toThrow(
        DomainValidationException,
      );
    });
  });

  describe('ensureCanDelete()', () => {
    const build = (reservedStock: number) =>
      PartSupply.reconstitute({
        id: 'ps-del-01',
        name: 'Filtro',
        description: null,
        sku: 'SKU-DEL',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 10,
        minStock: 0,
        reservedStock,
        version: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    it('should throw when there is reserved stock', () => {
      expect(() => build(2).ensureCanDelete()).toThrow(BusinessRuleViolationException);
    });

    it('should not throw when there is no reserved stock', () => {
      expect(() => build(0).ensureCanDelete()).not.toThrow();
    });
  });

  describe('ensureHasSufficientStock()', () => {
    it('should not throw when sufficient stock is available', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-uuid-001',
        name: 'Filtro',
        description: null,
        sku: 'SKU-001',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 5,
        minStock: 0,
        reservedStock: 0,
        version: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => partSupply.ensureHasSufficientStock(5)).not.toThrow();
    });
  });

  describe('applyStockMovement()', () => {
    it('should increment stock for ENTRY movement', () => {
      const partSupply = PartSupply.create({
        ...validProps,
        stock: 10,
      });

      partSupply.applyStockMovement(StockMovementType.ENTRY, 4);

      expect(partSupply.stock).toBe(14);
    });

    it('should decrement stock for EXIT movement', () => {
      const partSupply = PartSupply.create({
        ...validProps,
        stock: 10,
      });

      partSupply.applyStockMovement(StockMovementType.EXIT, 3);

      expect(partSupply.stock).toBe(7);
    });

    it('should set stock for ADJUSTMENT movement', () => {
      const partSupply = PartSupply.create({
        ...validProps,
        stock: 10,
      });

      partSupply.applyStockMovement(StockMovementType.ADJUSTMENT, 2);

      expect(partSupply.stock).toBe(2);
    });

    it('should throw when ADJUSTMENT quantity is below reservedStock', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-adj-01',
        name: 'Filtro',
        description: null,
        sku: 'SKU-ADJ',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 10,
        minStock: 0,
        reservedStock: 5,
        version: 1,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => partSupply.applyStockMovement(StockMovementType.ADJUSTMENT, 4)).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should allow ADJUSTMENT to exactly the reservedStock value', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-adj-02',
        name: 'Filtro',
        description: null,
        sku: 'SKU-ADJ2',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 10,
        minStock: 0,
        reservedStock: 3,
        version: 1,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => partSupply.applyStockMovement(StockMovementType.ADJUSTMENT, 3)).not.toThrow();
      expect(partSupply.stock).toBe(3);
    });

    it('should throw when quantity is invalid', () => {
      const partSupply = PartSupply.create({
        ...validProps,
        stock: 10,
      });

      expect(() => partSupply.applyStockMovement(StockMovementType.ENTRY, 0)).toThrow(
        DomainValidationException,
      );

      expect(() => partSupply.applyStockMovement(StockMovementType.ENTRY, 1.5)).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when EXIT quantity exceeds available stock', () => {
      const partSupply = PartSupply.create({
        ...validProps,
        stock: 3,
      });

      expect(() => partSupply.applyStockMovement(StockMovementType.EXIT, 4)).toThrow(
        'Estoque insuficiente',
      );
    });

    it('should throw when EXIT would reduce stock below reservedStock', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-01',
        name: 'Filtro',
        description: null,
        sku: 'SKU-01',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 5,
        minStock: 0,
        reservedStock: 3,
        version: 1,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => partSupply.applyStockMovement(StockMovementType.EXIT, 3)).toThrow(
        BusinessRuleViolationException,
      );
    });
  });

  describe('reserve()', () => {
    it('should increment reservedStock when sufficient stock is available', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-001',
        name: 'Filtro',
        description: null,
        sku: 'SKU-001',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 10,
        minStock: 0,
        reservedStock: 2,
        version: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      partSupply.reserve(3);

      expect(partSupply.reservedStock).toBe(5);
    });

    it('should throw BusinessRuleViolationException when insufficient available stock', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-001',
        name: 'Filtro',
        description: null,
        sku: 'SKU-001',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 5,
        minStock: 0,
        reservedStock: 4,
        version: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => partSupply.reserve(2)).toThrow(BusinessRuleViolationException);
    });
  });

  describe('consumeReserved()', () => {
    it('should decrement both stock and reservedStock', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-001',
        name: 'Filtro',
        description: null,
        sku: 'SKU-001',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 10,
        minStock: 0,
        reservedStock: 4,
        version: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      partSupply.consumeReserved(3);

      expect(partSupply.stock).toBe(7);
      expect(partSupply.reservedStock).toBe(1);
    });

    it('should throw BusinessRuleViolationException when quantity exceeds reservedStock', () => {
      const partSupply = PartSupply.reconstitute({
        id: 'ps-001',
        name: 'Filtro',
        description: null,
        sku: 'SKU-001',
        partNumber: null,
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 10,
        salePrice: 20,
        stock: 10,
        minStock: 0,
        reservedStock: 2,
        version: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => partSupply.consumeReserved(5)).toThrow(BusinessRuleViolationException);
    });
  });
});
