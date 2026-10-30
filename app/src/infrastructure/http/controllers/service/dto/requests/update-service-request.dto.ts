import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '@domain/constants/validation/service.constants';

export class UpdateServiceRequestDto {
  @ApiProperty({
    example: 'Troca de óleo premium',
    description: 'Nome do serviço (mín. 3 e máx. 150 caracteres)',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MinLength(MIN_NAME_LENGTH, {
    message: `O nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`,
  })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`,
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Troca com óleo sintético e filtro',
    description: `Descrição opcional (máx. ${MAX_DESCRIPTION_LENGTH} caracteres)`,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(MAX_DESCRIPTION_LENGTH, {
    message: `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`,
  })
  description?: string | null;

  @ApiProperty({ example: 189.9, description: 'Preço base do serviço (maior que zero)' })
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'O preço base deve ser um número válido' },
  )
  @IsPositive({ message: 'O preço base deve ser maior que zero' })
  basePrice!: number;

  @ApiProperty({ example: 90, description: 'Tempo estimado em minutos (inteiro maior que zero)' })
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 },
    { message: 'O tempo estimado deve ser um número inteiro' },
  )
  @IsPositive({ message: 'O tempo estimado deve ser maior que zero' })
  estimatedTimeMin!: number;
}
