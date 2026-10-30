import { PartSupply } from '@domain/entities/part-supply.entity';
import { UpdatePartSupplyDto } from '@application/ports/input/part-supply/dto/update-part-supply.dto';

export interface IUpdatePartSupplyUseCase {
  execute(id: string, input: UpdatePartSupplyDto): Promise<PartSupply>;
}
