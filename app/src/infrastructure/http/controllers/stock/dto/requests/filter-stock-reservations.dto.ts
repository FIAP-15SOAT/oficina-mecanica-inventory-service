import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '@infrastructure/http/common/dto/pagination.dto';

export class FilterStockReservationsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID da peça/insumo deve ser um UUID válido.' })
  partSupplyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID da ordem de serviço deve ser um UUID válido.' })
  workOrderId?: string;
}

export class FindStockReservationsQueryDto extends IntersectionType(
  PaginationDto,
  FilterStockReservationsDto,
) {}
