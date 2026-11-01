import { PartSupply } from '@domain/entities/part-supply.entity';
import { CreatePartSupplyDto } from '@application/ports/input/part-supply/dto/create-part-supply.dto';

export interface ICreatePartSupplyUseCase {
  execute(input: CreatePartSupplyDto): Promise<PartSupply>;
}
