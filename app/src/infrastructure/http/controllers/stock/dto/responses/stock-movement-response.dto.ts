import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import {
  StockMovementPaginatedResponse,
  StockMovementResponse,
} from '@interface-adapters/stock/responses/stock.response';
import { StockPartSupplyDto } from './stock-part-supply-response.dto';

export class StockMovementResponseDto implements StockMovementResponse {
  @ApiProperty({
    description: 'ID único da Movimentação de Estoque',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'ID da Peça ou Insumo movimentado',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  partSupplyId!: string;

  @ApiProperty({ type: StockPartSupplyDto, description: 'Resumo da Peça ou Insumo movimentado' })
  partSupply!: StockPartSupplyDto;

  @ApiPropertyOptional({
    description:
      'ID da Ordem de Serviço vinculada à saída (somente em EXIT). É apenas a referência: os dados da Ordem de Serviço pertencem ao serviço Work Order',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
    nullable: true,
  })
  workOrderId!: string | null;

  @ApiProperty({
    enum: StockMovementType,
    description: 'Tipo da movimentação: ENTRY (entrada), EXIT (saída), ADJUSTMENT (ajuste)',
    example: StockMovementType.ENTRY,
  })
  type!: StockMovementType;

  @ApiProperty({ description: 'Quantidade movimentada', example: 5 })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Motivo da movimentação',
    example: 'Reposição de estoque',
    nullable: true,
  })
  reason!: string | null;

  @ApiProperty({
    description: 'Data/hora da movimentação',
    example: '2026-04-21T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;
}

export class StockMovementPaginatedResponseDto
  extends PaginatedResponseDto<StockMovementResponseDto>
  implements StockMovementPaginatedResponse
{
  @ApiProperty({ type: [StockMovementResponseDto], description: 'Movimentações da página atual' })
  data!: StockMovementResponseDto[];
}
