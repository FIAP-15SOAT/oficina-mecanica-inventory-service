import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { StockPartSupplyResponse } from '@interface-adapters/stock/responses/stock.response';

export class StockPartSupplyDto implements StockPartSupplyResponse {
  @ApiProperty({
    description: 'ID único da Peça ou Insumo',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Nome da Peça ou Insumo', example: 'Filtro de Óleo' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada',
    example: 'Filtro para motor 1.0',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ description: 'SKU único no Estoque', example: 'FO-001' })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Número de referência do fabricante',
    example: 'MANN-W712',
    nullable: true,
  })
  partNumber!: string | null;

  @ApiProperty({
    enum: PartSupplyCategory,
    description: 'Categoria: PART (Peça) ou SUPPLY (Insumo)',
    example: PartSupplyCategory.PART,
  })
  category!: PartSupplyCategory;

  @ApiProperty({ enum: Unit, description: 'Unidade de medida', example: Unit.UN })
  unit!: Unit;
}
