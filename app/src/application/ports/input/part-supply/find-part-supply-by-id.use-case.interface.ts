import { PartSupply } from '@domain/entities/part-supply.entity';

export interface IFindPartSupplyByIdUseCase {
  execute(id: string): Promise<PartSupply>;
}
