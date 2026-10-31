import { Service } from '@domain/entities/service.entity';

export interface IFindServiceByIdUseCase {
  execute(id: string): Promise<Service>;
}
