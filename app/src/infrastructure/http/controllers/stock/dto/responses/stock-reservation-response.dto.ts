import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import {
  StockReservationPaginatedResponse,
  StockReservationResponse,
} from '@interface-adapters/stock/responses/stock.response';
import { StockPartSupplyDto } from './stock-part-supply-response.dto';

export class StockReservationResponseDto implements StockReservationResponse {
  @ApiProperty({
    description: 'ID único da Reserva de Estoque',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'ID da Peça ou Insumo reservado',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  partSupplyId!: string;

  @ApiProperty({ type: StockPartSupplyDto, description: 'Resumo da Peça ou Insumo reservado' })
  partSupply!: StockPartSupplyDto;

  @ApiProperty({
    description:
      'ID da Ordem de Serviço que originou a reserva. É apenas a referência: os dados da Ordem de Serviço pertencem ao serviço Work Order',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  workOrderId!: string;

  @ApiProperty({ description: 'Quantidade reservada', example: 2 })
  quantity!: number;

  @ApiProperty({
    description: 'Data/hora da criação da reserva',
    example: '2026-04-21T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;
}

export class StockReservationPaginatedResponseDto
  extends PaginatedResponseDto<StockReservationResponseDto>
  implements StockReservationPaginatedResponse
{
  @ApiProperty({ type: [StockReservationResponseDto], description: 'Reservas da página atual' })
  data!: StockReservationResponseDto[];
}
