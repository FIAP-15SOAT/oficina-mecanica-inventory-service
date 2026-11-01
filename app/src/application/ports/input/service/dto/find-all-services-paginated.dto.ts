import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindAllServicesPaginatedInputDto extends PaginationInput {
  name?: string;
}
