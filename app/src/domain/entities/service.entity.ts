import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '../constants/validation/service.constants';

interface ServiceProps {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  estimatedTimeMin: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateServiceProps {
  name: string;
  description?: string | null;
  basePrice: number;
  estimatedTimeMin: number;
}

export class Service {
  readonly id: string;
  name: string;
  description: string | null;
  basePrice: number;
  estimatedTimeMin: number;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: ServiceProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.basePrice = props.basePrice;
    this.estimatedTimeMin = props.estimatedTimeMin;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: ServiceProps): Service {
    return new Service(props);
  }

  static create(props: {
    name: string;
    description?: string | null;
    basePrice: number;
    estimatedTimeMin: number;
  }): Service {
    Service.validateProps(props);

    const now = new Date();

    return new Service({
      id: randomUUID(),
      name: props.name.trim(),
      description: props.description?.trim() ?? null,
      basePrice: props.basePrice,
      estimatedTimeMin: props.estimatedTimeMin,
      createdAt: now,
      updatedAt: now,
    });
  }

  update(props: CreateServiceProps): void {
    Service.validateProps(props);

    this.name = props.name.trim();
    this.description = props.description?.trim() ?? null;
    this.basePrice = props.basePrice;
    this.estimatedTimeMin = props.estimatedTimeMin;
    this.updatedAt = new Date();
  }

  private static validateProps(props: CreateServiceProps): void {
    Service.validateName(props.name);
    Service.validateDescription(props.description);
    Service.validateBasePrice(props.basePrice);
    Service.validateEstimatedTimeMin(props.estimatedTimeMin);
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

  private static validateDescription(description?: string | null): void {
    const trimmed = description?.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new DomainValidationException(
        `Descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`,
      );
    }
  }

  private static validateBasePrice(basePrice: number): void {
    if (!Number.isFinite(basePrice)) {
      throw new DomainValidationException('Preço base inválido');
    }

    if (basePrice <= 0) {
      throw new DomainValidationException('Preço base deve ser maior que zero');
    }
  }

  private static validateEstimatedTimeMin(estimatedTimeMin: number): void {
    if (!Number.isInteger(estimatedTimeMin)) {
      throw new DomainValidationException('Tempo estimado deve ser um número inteiro');
    }

    if (estimatedTimeMin <= 0) {
      throw new DomainValidationException('Tempo estimado deve ser maior que zero');
    }
  }
}
