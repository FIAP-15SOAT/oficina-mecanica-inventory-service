import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches, IsUUID, IsDateString } from 'class-validator';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PaginationDto } from '@infrastructure/http/common/dto/pagination.dto';

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class FilterStockMovementsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID da peça/insumo deve ser um UUID válido.' })
  partSupplyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID da ordem de serviço deve ser um UUID válido.' })
  workOrderId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType, {
    message: `type deve ser um dos seguintes: ${Object.values(StockMovementType).join(', ')}`,
  })
  type?: StockMovementType;

  @ApiPropertyOptional({ description: 'Data inicial no formato yyyy-MM-dd', example: '2025-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate deve ser uma data válida' })
  @Matches(DATE_FORMAT_REGEX, { message: 'startDate deve estar no formato yyyy-MM-dd' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final no formato yyyy-MM-dd', example: '2025-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate deve ser uma data válida' })
  @Matches(DATE_FORMAT_REGEX, { message: 'endDate deve estar no formato yyyy-MM-dd' })
  endDate?: string;
}

export class FindStockMovementsQueryDto extends IntersectionType(
  PaginationDto,
  FilterStockMovementsDto,
) {}
