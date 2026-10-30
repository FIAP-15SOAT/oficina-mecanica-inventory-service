import { randomUUID } from 'node:crypto';
import { validate as isUuid } from 'uuid';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PartSupply } from './part-supply.entity';

export interface CreateStockReservationProps {
  partSupplyId: string;
  workOrderId: string;
  quantity: number;
}

interface StockReservationProps {
  id: string;
  partSupplyId: string;
  workOrderId: string;
  quantity: number;
  createdAt: Date;
}

export class StockReservation {
  readonly id: string;
  readonly partSupplyId: string;
  readonly workOrderId: string;
  readonly quantity: number;
  readonly createdAt: Date;

  partSupply?: PartSupply;

  private constructor(props: StockReservationProps) {
    this.id = props.id;
    this.partSupplyId = props.partSupplyId;
    this.workOrderId = props.workOrderId;
    this.quantity = props.quantity;
    this.createdAt = props.createdAt;
  }

  static reconstitute(props: StockReservationProps): StockReservation {
    return new StockReservation(props);
  }

  static create(props: CreateStockReservationProps): StockReservation {
    StockReservation.validatePartSupplyId(props.partSupplyId);
    StockReservation.validateWorkOrderId(props.workOrderId);
    StockReservation.validateQuantity(props.quantity);

    const partSupplyId = props.partSupplyId.trim();
    const workOrderId = props.workOrderId.trim();

    return new StockReservation({
      id: randomUUID(),
      partSupplyId,
      workOrderId,
      quantity: props.quantity,
      createdAt: new Date(),
    });
  }

  private static validatePartSupplyId(partSupplyId: string): void {
    const trimmed = partSupplyId?.trim();

    if (!trimmed) {
      throw new DomainValidationException('ID da peça/insumo é obrigatório.');
    }

    if (!isUuid(trimmed)) {
      throw new DomainValidationException(`ID da peça/insumo deve ser um UUID válido.`);
    }
  }

  private static validateWorkOrderId(workOrderId: string): void {
    const trimmed = workOrderId?.trim();

    if (!trimmed) {
      throw new DomainValidationException('ID da ordem de serviço é obrigatório.');
    }

    if (!isUuid(trimmed)) {
      throw new DomainValidationException(`ID da ordem de serviço deve ser um UUID válido.`);
    }
  }

  private static validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser um inteiro positivo.');
    }
  }
}
