import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface ServiceResponse {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  estimatedTimeMin: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceDataResponse {
  data: ServiceResponse;
}

export interface ServicePaginatedResponse {
  data: ServiceResponse[];
  pagination: PaginationMeta;
}
