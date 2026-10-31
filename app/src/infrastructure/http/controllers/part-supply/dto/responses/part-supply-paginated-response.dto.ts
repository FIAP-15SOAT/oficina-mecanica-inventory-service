import { ApiProperty } from '@nestjs/swagger';
import { PartSupplyResponseDto } from './part-supply-response.dto';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import { PartSupplyPaginatedResponse } from '@interface-adapters/part-supply/responses/part-supply.response';

export class PartSupplyPaginatedResponseDto
  extends PaginatedResponseDto<PartSupplyResponseDto>
  implements PartSupplyPaginatedResponse
{
  @ApiProperty({ type: [PartSupplyResponseDto], description: 'Peças e Insumos da página atual' })
  data!: PartSupplyResponseDto[];
}
