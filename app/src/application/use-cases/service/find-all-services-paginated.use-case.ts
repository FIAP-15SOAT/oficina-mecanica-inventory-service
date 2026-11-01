import { Service } from '@domain/entities/service.entity';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { FindAllServicesPaginatedInputDto } from '@application/ports/input/service/dto/find-all-services-paginated.dto';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindAllServicesPaginatedUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(input: FindAllServicesPaginatedInputDto): Promise<PaginatedResult<Service>> {
    const { page, limit, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const result = await this.serviceRepository.findAllPaginated(pagination, filters);

    return buildPaginatedResult(result, pagination);
  }
}
