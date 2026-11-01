import { PartSupply } from '@domain/entities/part-supply.entity';
import { UpdateStockDto } from '@application/ports/input/part-supply/dto/update-stock.dto';

export interface IUpdateStockUseCase {
  execute(id: string, input: UpdateStockDto): Promise<PartSupply>;
}
