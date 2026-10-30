import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { PaginationDto } from '@infrastructure/http/common/dto/pagination.dto';

export class FilterPartsSuppliesDto {
  @ApiPropertyOptional({
    description: 'Filtrar por nome da Peça ou Insumo',
    example: 'Filtro de Óleo',
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Filtrar por SKU da Peça ou Insumo', example: 'FO-001' })
  @IsOptional()
  @IsString({ message: 'O SKU deve ser um texto.' })
  sku?: string;

  @ApiPropertyOptional({
    enum: PartSupplyCategory,
    description: 'Filtrar por categoria: PART (Peça) ou SUPPLY (Insumo)',
  })
  @IsOptional()
  @IsEnum(PartSupplyCategory, {
    message: 'Categoria inválida. Use PART (Peça) ou SUPPLY (Insumo).',
  })
  category?: PartSupplyCategory;

  @ApiPropertyOptional({ description: 'Filtrar apenas itens com estoque abaixo do mínimo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O filtro de estoque baixo deve ser true ou false.' })
  lowStock?: boolean;
}

export class FindAllPartsSuppliesQueryDto extends IntersectionType(
  PaginationDto,
  FilterPartsSuppliesDto,
) {}
