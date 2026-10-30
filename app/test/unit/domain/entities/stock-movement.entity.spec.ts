import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('StockMovement Entity', () => {
  const validProps = {
    partSupplyId: '123e4567-e89b-12d3-a456-426614174000',
    workOrderId: '223e4567-e89b-12d3-a456-426614174001',
    type: StockMovementType.EXIT,
    quantity: 2,
    reason: 'Saída por OS WO-001',
  };

  describe('create()', () => {
    it('should create a valid StockMovement', () => {
      const movement = StockMovement.create(validProps);

      expect(movement).toBeInstanceOf(StockMovement);
      expect(movement.partSupplyId).toBe(validProps.partSupplyId);
      expect(movement.workOrderId).toBe(validProps.workOrderId);
      expect(movement.type).toBe(StockMovementType.EXIT);
      expect(movement.quantity).toBe(2);
      expect(movement.reason).toBe(validProps.reason);
      expect(movement.id).toBeDefined();
      expect(movement.createdAt).toBeInstanceOf(Date);
    });

    it('should create without workOrderId (null)', () => {
      const movement = StockMovement.create({
        ...validProps,
        workOrderId: null,
        type: StockMovementType.ENTRY,
        reason: 'Entrada de estoque',
      });

      expect(movement.workOrderId).toBeNull();
    });

    it('should create without reason (null)', () => {
      const movement = StockMovement.create({
        ...validProps,
        reason: null,
      });

      expect(movement.reason).toBeNull();
    });

    it('should throw when partSupplyId is empty', () => {
      expect(() => StockMovement.create({ ...validProps, partSupplyId: '' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when partSupplyId is not a valid UUID', () => {
      expect(() => StockMovement.create({ ...validProps, partSupplyId: 'invalid-uuid' })).toThrow(
        'ID da peça/insumo inválido.',
      );
    });

    it('should throw when workOrderId is not a valid UUID', () => {
      expect(() => StockMovement.create({ ...validProps, workOrderId: 'invalid-uuid' })).toThrow(
        'ID da ordem de serviço inválido.',
      );
    });

    it('should throw when quantity is zero', () => {
      expect(() => StockMovement.create({ ...validProps, quantity: 0 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when quantity is negative', () => {
      expect(() => StockMovement.create({ ...validProps, quantity: -1 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when quantity is not an integer', () => {
      expect(() => StockMovement.create({ ...validProps, quantity: 1.5 })).toThrow(
        DomainValidationException,
      );
    });

    it('should support ENTRY and ADJUSTMENT types', () => {
      const entry = StockMovement.create({ ...validProps, type: StockMovementType.ENTRY });
      expect(entry.type).toBe(StockMovementType.ENTRY);

      const adj = StockMovement.create({ ...validProps, type: StockMovementType.ADJUSTMENT });
      expect(adj.type).toBe(StockMovementType.ADJUSTMENT);
    });
  });

  describe('reconstitute()', () => {
    it('should set all props from partial', () => {
      const now = new Date();

      const movement = StockMovement.reconstitute({
        id: 'some-id',
        partSupplyId: 'part-id',
        type: StockMovementType.EXIT,
        quantity: 1,
        createdAt: now,
      });

      expect(movement.id).toBe('some-id');
      expect(movement.createdAt).toBe(now);
    });
  });
});
