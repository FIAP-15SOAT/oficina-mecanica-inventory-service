import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

export class UpdateStockDto {
  @ApiProperty({
    enum: StockMovementType,
    description:
      'Tipo de movimentação: ENTRY (Entrada de Peças e Insumos), EXIT (Saída), ADJUSTMENT (Ajuste: define o saldo, nunca abaixo do estoque reservado)',
    example: StockMovementType.ENTRY,
  })
  @IsEnum(StockMovementType, {
    message: 'Tipo de movimentação inválido. Use ENTRY, EXIT ou ADJUSTMENT.',
  })
  type!: StockMovementType;

  @ApiProperty({ description: 'Quantidade de Peças ou Insumos movimentados', example: 5 })
  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @IsPositive({ message: 'A quantidade deve ser positiva.' })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Motivo da movimentação de Estoque',
    example: 'Reposição de Estoque recebida do fornecedor',
  })
  @IsOptional()
  @IsString({ message: 'O motivo deve ser um texto.' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'ID da Ordem de Serviço vinculada à movimentação (opcional)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da Ordem de Serviço deve ser um UUID válido.' })
  workOrderId?: string;
}
