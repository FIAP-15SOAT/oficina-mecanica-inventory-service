import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { randomUUID } from 'node:crypto';

describe('StockReservation Entity', () => {
  const validProps = {
    partSupplyId: randomUUID(),
    workOrderId: randomUUID(),
    quantity: 5,
  };

  describe('create()', () => {
    it('should create a valid StockReservation', () => {
      const reservation = StockReservation.create(validProps);

      expect(reservation).toBeInstanceOf(StockReservation);
      expect(reservation.partSupplyId).toBe(validProps.partSupplyId);
      expect(reservation.workOrderId).toBe(validProps.workOrderId);
      expect(reservation.quantity).toBe(validProps.quantity);
      expect(reservation.id).toBeDefined();
      expect(reservation.createdAt).toBeInstanceOf(Date);
    });

    it('should throw when partSupplyId is empty', () => {
      expect(() => StockReservation.create({ ...validProps, partSupplyId: '' })).toThrow(
        'ID da peça/insumo é obrigatório.',
      );
    });

    it('should throw when partSupplyId is not a valid UUID', () => {
      expect(() => StockReservation.create({ ...validProps, partSupplyId: 'not-a-uuid' })).toThrow(
        'ID da peça/insumo deve ser um UUID válido.',
      );
    });

    it('should throw when workOrderId is empty', () => {
      expect(() => StockReservation.create({ ...validProps, workOrderId: '' })).toThrow(
        'ID da ordem de serviço é obrigatório.',
      );
    });

    it('should throw when workOrderId is not a valid UUID', () => {
      expect(() => StockReservation.create({ ...validProps, workOrderId: 'not-a-uuid' })).toThrow(
        'ID da ordem de serviço deve ser um UUID válido.',
      );
    });

    it('should throw when quantity is zero', () => {
      expect(() => StockReservation.create({ ...validProps, quantity: 0 })).toThrow(
        'Quantidade deve ser um inteiro positivo.',
      );
    });

    it('should throw when quantity is negative', () => {
      expect(() => StockReservation.create({ ...validProps, quantity: -1 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw when quantity is not an integer', () => {
      expect(() => StockReservation.create({ ...validProps, quantity: 2.5 })).toThrow(
        DomainValidationException,
      );
    });
  });

  describe('reconstitute()', () => {
    it('should set props from partial', () => {
      const now = new Date();
      const id = randomUUID();
      const reservation = StockReservation.reconstitute({
        id,
        partSupplyId: randomUUID(),
        workOrderId: randomUUID(),
        quantity: 1,
        createdAt: now,
      });

      expect(reservation.id).toBe(id);
      expect(reservation.createdAt).toBe(now);
    });
  });
});
