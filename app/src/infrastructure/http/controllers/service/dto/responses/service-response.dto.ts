import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceDataResponse,
  ServiceResponse,
} from '@interface-adapters/service/responses/service.response';

export class ServiceResponseDto implements ServiceResponse {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único do serviço',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Troca de óleo', description: 'Nome do serviço' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Troca de óleo com filtro',
    description: 'Descrição opcional do serviço',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: 129.9, description: 'Preço base do serviço' })
  basePrice!: number;

  @ApiProperty({ example: 60, description: 'Tempo estimado em minutos' })
  estimatedTimeMin!: number;

  @ApiProperty({
    example: '2026-04-20T12:00:00.000Z',
    format: 'date-time',
    description: 'Data de criação do serviço',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-04-20T12:00:00.000Z',
    format: 'date-time',
    description: 'Data da última atualização do serviço',
  })
  updatedAt!: Date;
}

export class ServiceDataResponseDto implements ServiceDataResponse {
  @ApiProperty({
    type: ServiceResponseDto,
    description: 'Dados do serviço',
  })
  data!: ServiceResponseDto;
}
