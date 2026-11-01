import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';

export interface FindAllServicesQuery extends PaginationQuery {
  name?: string;
}
