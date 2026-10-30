import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@infrastructure/http/decorators/roles.decorator';
import { RolesGuard } from '@infrastructure/http/guards/roles.guard';
import { UserRole } from '@domain/enums/user-role.enum';

import { PartSupplyController as PartSupplyCleanController } from '@interface-adapters/part-supply/part-supply.controller';

import { CreatePartSupplyRequestDto } from './dto/requests/create-part-supply-request.dto';
import { UpdatePartSupplyRequestDto } from './dto/requests/update-part-supply-request.dto';
import { UpdateStockDto } from './dto/requests/update-stock.dto';
import { FindAllPartsSuppliesQueryDto } from './dto/requests/filter-parts-supplies.dto';
import { PartSupplyDataResponseDto } from './dto/responses/part-supply-response.dto';
import { PartSupplyPaginatedResponseDto } from './dto/responses/part-supply-paginated-response.dto';

@ApiTags('Gestão de Peças e Insumos')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('parts-supplies')
export class PartSupplyController {
  constructor(private readonly controller: PartSupplyCleanController) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cadastrar Peça ou Insumo (somente Admin)' })
  @ApiCreatedResponse({
    type: PartSupplyDataResponseDto,
    description: 'Peça ou Insumo cadastrado com sucesso',
  })
  @ApiConflictResponse({ description: 'Já existe uma Peça ou Insumo com este SKU no Estoque' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  create(@Body() request: CreatePartSupplyRequestDto): Promise<PartSupplyDataResponseDto> {
    return this.controller.create(request);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Consultar Estoque de Peças e Insumos (Admin, Atendente e Mecânico)' })
  @ApiOkResponse({
    type: PartSupplyPaginatedResponseDto,
    description: 'Lista paginada de Peças e Insumos',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  findAll(@Query() query: FindAllPartsSuppliesQueryDto): Promise<PartSupplyPaginatedResponseDto> {
    return this.controller.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Buscar Peça ou Insumo por ID (Admin e Atendente)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiOkResponse({ type: PartSupplyDataResponseDto, description: 'Peça ou Insumo encontrado' })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado no Estoque' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<PartSupplyDataResponseDto> {
    return this.controller.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar Peça ou Insumo (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiOkResponse({
    type: PartSupplyDataResponseDto,
    description: 'Peça ou Insumo atualizado com sucesso',
  })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado no Estoque' })
  @ApiConflictResponse({ description: 'SKU já está em uso por outra Peça ou Insumo' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdatePartSupplyRequestDto,
  ): Promise<PartSupplyDataResponseDto> {
    return this.controller.update(id, request);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Movimentar Estoque manualmente (Admin e Atendente)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiOkResponse({ type: PartSupplyDataResponseDto, description: 'Estoque atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado no Estoque' })
  @ApiConflictResponse({
    description:
      'Estoque insuficiente para a saída, ou saldo resultante abaixo do estoque reservado, ou conflito de versão concorrente',
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateStockDto,
  ): Promise<PartSupplyDataResponseDto> {
    return this.controller.updateStock(id, request);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir Peça ou Insumo (somente Admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da Peça ou Insumo' })
  @ApiNoContentResponse({ description: 'Peça ou Insumo excluído' })
  @ApiBadRequestResponse({ description: 'ID inválido (UUID esperado)' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiNotFoundResponse({ description: 'Peça ou Insumo não encontrado' })
  @ApiConflictResponse({
    description:
      'Estoque reservado, vínculo com ordens de serviço ou orçamentos, ou movimentações de estoque e reservas no histórico',
  })
  @ApiServiceUnavailableResponse({
    description: 'Serviço dono dos orçamentos indisponível; nada foi excluído',
  })
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.controller.delete(id);
  }
}
