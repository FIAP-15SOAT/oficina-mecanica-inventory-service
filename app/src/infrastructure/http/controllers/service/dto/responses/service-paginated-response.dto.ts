import { ApiProperty } from '@nestjs/swagger';
import { ServiceResponseDto } from './service-response.dto';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import { ServicePaginatedResponse } from '@interface-adapters/service/responses/service.response';

export class ServicePaginatedResponseDto
  extends PaginatedResponseDto<ServiceResponseDto>
  implements ServicePaginatedResponse
{
  @ApiProperty({
    type: [ServiceResponseDto],
    description: 'Serviços da página atual',
  })
  data!: ServiceResponseDto[];
}
