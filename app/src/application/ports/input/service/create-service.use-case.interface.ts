import { Service } from '@domain/entities/service.entity';
import { CreateServiceDto } from '@application/ports/input/service/dto/create-service.dto';

export interface ICreateServiceUseCase {
  execute(input: CreateServiceDto): Promise<Service>;
}
