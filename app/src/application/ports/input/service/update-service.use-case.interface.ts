import { Service } from '@domain/entities/service.entity';
import { UpdateServiceDto } from '@application/ports/input/service/dto/update-service.dto';

export interface IUpdateServiceUseCase {
  execute(id: string, input: UpdateServiceDto): Promise<Service>;
}
