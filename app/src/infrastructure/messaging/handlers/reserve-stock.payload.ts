import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsPositive, IsUUID, ValidateNested } from 'class-validator';

export class ReserveStockItemPayload {
  @IsUUID('4')
  partSupplyId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class ReserveStockPayload {
  @IsUUID('4')
  quoteId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReserveStockItemPayload)
  items!: ReserveStockItemPayload[];
}
