import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import {
  PartSupplyDataResponse,
  PartSupplyResponse,
} from '@interface-adapters/part-supply/responses/part-supply.response';

export class PartSupplyResponseDto implements PartSupplyResponse {
  @ApiProperty({
    description: 'ID único da Peça ou Insumo',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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
    description: 'Número de referência do fabricante ou fornecedor',
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

  @ApiProperty({ description: 'Preço de custo', example: 25.0 })
  costPrice!: number;

  @ApiProperty({ description: 'Preço de venda', example: 45.0 })
  salePrice!: number;

  @ApiProperty({ description: 'Quantidade disponível no Estoque', example: 10 })
  stock!: number;

  @ApiProperty({ description: 'Estoque mínimo para alerta de Reposição de Estoque', example: 2 })
  minStock!: number;

  @ApiProperty({
    description: 'Quantidade do estoque já reservada para Ordens de Serviço aprovadas',
    example: 0,
  })
  reservedStock!: number;

  @ApiPropertyOptional({
    description: 'Data de validade da Peça ou Insumo',
    example: '2026-12-31T00:00:00.000Z',
    nullable: true,
  })
  expiresAt!: Date | null;

  @ApiProperty({ description: 'Data de cadastro', example: '2026-01-15T10:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização', example: '2026-04-21T08:00:00.000Z' })
  updatedAt!: Date;
}

export class PartSupplyDataResponseDto implements PartSupplyDataResponse {
  @ApiProperty({ type: PartSupplyResponseDto })
  data!: PartSupplyResponseDto;
}
