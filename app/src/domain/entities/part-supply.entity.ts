import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';
import { PartSupplyCategory } from '../enums/part-supply-category.enum';
import { Unit } from '../enums/unit.enum';
import { StockMovementType } from '../enums/stock-movement-type.enum';

import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SKU_LENGTH,
  MAX_PART_NUMBER_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '../constants/validation/part-supply.constants';

export interface CreatePartSupplyProps {
  name: string;
  description?: string;
  sku: string;
  partNumber?: string;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  stock?: number;
  minStock?: number;
  expiresAt?: Date;
}

export interface UpdatePartSupplyProps {
  name: string;
  description?: string;
  sku: string;
  partNumber?: string;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  minStock?: number;
  expiresAt?: Date;
}

interface PartSupplyProps {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  partNumber: string | null;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  reservedStock: number;
  version: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PartSupply {
  readonly id: string;
  name: string;
  description: string | null;
  sku: string;
  partNumber: string | null;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  reservedStock: number;
  version: number;
  expiresAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: PartSupplyProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.sku = props.sku;
    this.partNumber = props.partNumber;
    this.category = props.category;
    this.unit = props.unit;
    this.costPrice = props.costPrice;
    this.salePrice = props.salePrice;
    this.stock = props.stock;
    this.minStock = props.minStock;
    this.reservedStock = props.reservedStock;
    this.version = props.version;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: PartSupplyProps): PartSupply {
    return new PartSupply(props);
  }

  static create(props: CreatePartSupplyProps): PartSupply {
    PartSupply.validateProps(props);

    const now = new Date();

    return new PartSupply({
      id: randomUUID(),
      name: props.name.trim(),
      description: props.description?.trim() ?? null,
      sku: props.sku.trim(),
      partNumber: props.partNumber?.trim() ?? null,
      category: props.category,
      unit: props.unit,
      costPrice: props.costPrice,
      salePrice: props.salePrice,
      stock: props.stock ?? 0,
      minStock: props.minStock ?? 0,
      reservedStock: 0,
      version: 1,
      expiresAt: props.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  applyStockMovement(type: StockMovementType, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser um inteiro positivo.');
    }

    if (type === StockMovementType.ENTRY) {
      this.stock += quantity;
    } else if (type === StockMovementType.EXIT) {
      if (quantity > this.stock) {
        throw new BusinessRuleViolationException(
          `Estoque insuficiente. Solicitado: ${quantity}, disponível: ${this.stock}.`,
        );
      }

      if (this.stock - quantity < this.reservedStock) {
        throw new BusinessRuleViolationException(
          `Não é possível reduzir o estoque abaixo do estoque reservado. Estoque atual: ${this.stock}, Reservado: ${this.reservedStock}, Redução solicitada: ${quantity}.`,
        );
      }

      this.stock -= quantity;
    } else {
      if (quantity < this.reservedStock) {
        throw new BusinessRuleViolationException(
          `Não é possível ajustar o estoque abaixo do estoque reservado. Reservado: ${this.reservedStock}, Ajuste solicitado: ${quantity}.`,
        );
      }

      this.stock = quantity;
    }

    this.updatedAt = new Date();
  }

  update(props: UpdatePartSupplyProps): void {
    PartSupply.validateUpdateProps(props);

    this.name = props.name.trim();
    this.description = props.description?.trim() ?? null;
    this.sku = props.sku.trim();
    this.partNumber = props.partNumber?.trim() ?? null;
    this.category = props.category;
    this.unit = props.unit;
    this.costPrice = props.costPrice;
    this.salePrice = props.salePrice;
    this.minStock = props.minStock ?? this.minStock;
    this.expiresAt = props.expiresAt ?? null;
    this.updatedAt = new Date();
  }

  private static validateProps(props: CreatePartSupplyProps): void {
    PartSupply.validateName(props.name);
    PartSupply.validateSku(props.sku);
    PartSupply.validatePartNumber(props.partNumber ?? null);
    PartSupply.validateDescription(props.description ?? null);
    PartSupply.validateCostPrice(props.costPrice);
    PartSupply.validateSalePrice(props.salePrice);
    PartSupply.validateStock(props.stock ?? 0);
    PartSupply.validateMinStock(props.minStock ?? 0);
    PartSupply.validateExpiresAt(props.expiresAt ?? null);
  }

  private static validateUpdateProps(props: UpdatePartSupplyProps): void {
    PartSupply.validateName(props.name);
    PartSupply.validateSku(props.sku);
    PartSupply.validatePartNumber(props.partNumber ?? null);
    PartSupply.validateDescription(props.description ?? null);
    PartSupply.validateCostPrice(props.costPrice);
    PartSupply.validateSalePrice(props.salePrice);
    PartSupply.validateMinStock(props.minStock ?? 0);
    PartSupply.validateExpiresAt(props.expiresAt ?? null);
  }

  private static validateName(name: string): void {
    const trimmed = name?.trim();

    if (!trimmed) {
      throw new DomainValidationException('Nome é obrigatório');
    }

    if (trimmed.length < MIN_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`);
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
    }
  }

  private static validateSku(sku: string): void {
    const trimmed = sku?.trim();

    if (!trimmed) {
      throw new DomainValidationException('SKU é obrigatório');
    }

    if (trimmed.length > MAX_SKU_LENGTH) {
      throw new DomainValidationException(`SKU deve ter no máximo ${MAX_SKU_LENGTH} caracteres`);
    }
  }

  private static validatePartNumber(partNumber: string | null): void {
    const trimmed = partNumber?.trim();

    if (!trimmed) return;

    if (trimmed.length > MAX_PART_NUMBER_LENGTH) {
      throw new DomainValidationException(
        `Número de referência deve ter no máximo ${MAX_PART_NUMBER_LENGTH} caracteres`,
      );
    }
  }

  private static validateDescription(description: string | null): void {
    const trimmed = description?.trim();

    if (!trimmed) return;

    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new DomainValidationException(
        `Descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`,
      );
    }
  }

  private static validateCostPrice(costPrice: number): void {
    if (!Number.isFinite(costPrice)) {
      throw new DomainValidationException('Preço de custo inválido');
    }

    if (costPrice <= 0) {
      throw new DomainValidationException('Preço de custo deve ser maior que zero');
    }
  }

  private static validateSalePrice(salePrice: number): void {
    if (!Number.isFinite(salePrice)) {
      throw new DomainValidationException('Preço de venda inválido');
    }

    if (salePrice <= 0) {
      throw new DomainValidationException('Preço de venda deve ser maior que zero');
    }
  }

  private static validateStock(stock: number): void {
    if (!Number.isInteger(stock)) {
      throw new DomainValidationException('Estoque deve ser um número inteiro');
    }

    if (stock < 0) {
      throw new DomainValidationException('Estoque não pode ser negativo');
    }
  }

  private static validateMinStock(minStock: number): void {
    if (!Number.isInteger(minStock)) {
      throw new DomainValidationException('Estoque mínimo deve ser um número inteiro');
    }

    if (minStock < 0) {
      throw new DomainValidationException('Estoque mínimo não pode ser negativo');
    }
  }

  private static validateExpiresAt(expiresAt: Date | null): void {
    if (!expiresAt) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiresAt < today) {
      throw new DomainValidationException('Data de validade não pode ser anterior a hoje.');
    }
  }

  ensureCanDelete(): void {
    if (this.reservedStock > 0) {
      throw new BusinessRuleViolationException(
        'Não é possível excluir uma peça/insumo com estoque reservado.',
      );
    }
  }

  ensureHasSufficientStock(requestedQuantity: number): void {
    const available = this.stock - this.reservedStock;

    if (available < requestedQuantity) {
      throw new BusinessRuleViolationException(
        `Estoque insuficiente para a peça/insumo "${this.name}". Disponível: ${available}, Solicitado: ${requestedQuantity}`,
      );
    }
  }

  reserve(quantity: number): void {
    this.ensureHasSufficientStock(quantity);
    this.reservedStock += quantity;
    this.updatedAt = new Date();
  }

  consumeReserved(quantity: number): void {
    if (quantity > this.reservedStock) {
      throw new BusinessRuleViolationException(
        `Reserva insuficiente para "${this.name}". Reservado: ${this.reservedStock}, Solicitado: ${quantity}.`,
      );
    }

    this.stock -= quantity;
    this.reservedStock -= quantity;
    this.updatedAt = new Date();
  }
}
