import { ICreatePartSupplyUseCase } from '@application/ports/input/part-supply/create-part-supply.use-case.interface';
import { IFindAllPartsSuppliesUseCase } from '@application/ports/input/part-supply/find-all-parts-supplies.use-case.interface';
import { IFindPartSupplyByIdUseCase } from '@application/ports/input/part-supply/find-part-supply-by-id.use-case.interface';
import { IUpdatePartSupplyUseCase } from '@application/ports/input/part-supply/update-part-supply.use-case.interface';
import { IDeletePartSupplyUseCase } from '@application/ports/input/part-supply/delete-part-supply.use-case.interface';
import { IUpdateStockUseCase } from '@application/ports/input/part-supply/update-stock.use-case.interface';

import { CreatePartSupplyRequest } from './requests/create-part-supply-request';
import { UpdatePartSupplyRequest } from './requests/update-part-supply-request';
import { FindAllPartsSuppliesQuery } from './requests/find-all-parts-supplies-query';
import { UpdateStockRequest } from './requests/update-stock-request';

import { PartSupplyPresenter } from './part-supply.presenter';
import {
  PartSupplyDataResponse,
  PartSupplyPaginatedResponse,
} from './responses/part-supply.response';

export class PartSupplyController {
  constructor(
    private readonly createPartSupplyUseCase: ICreatePartSupplyUseCase,
    private readonly findAllPartsSuppliesUseCase: IFindAllPartsSuppliesUseCase,
    private readonly findPartSupplyByIdUseCase: IFindPartSupplyByIdUseCase,
    private readonly updatePartSupplyUseCase: IUpdatePartSupplyUseCase,
    private readonly deletePartSupplyUseCase: IDeletePartSupplyUseCase,
    private readonly updateStockUseCase: IUpdateStockUseCase,
  ) {}

  async create(input: CreatePartSupplyRequest): Promise<PartSupplyDataResponse> {
    const partSupply = await this.createPartSupplyUseCase.execute({
      ...input,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });

    return PartSupplyPresenter.toDataResponse(partSupply);
  }

  async findAll(query: FindAllPartsSuppliesQuery): Promise<PartSupplyPaginatedResponse> {
    const result = await this.findAllPartsSuppliesUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return PartSupplyPresenter.toPaginatedDataResponse(result);
  }

  async findById(id: string): Promise<PartSupplyDataResponse> {
    const partSupply = await this.findPartSupplyByIdUseCase.execute(id);
    return PartSupplyPresenter.toDataResponse(partSupply);
  }

  async update(id: string, input: UpdatePartSupplyRequest): Promise<PartSupplyDataResponse> {
    const partSupply = await this.updatePartSupplyUseCase.execute(id, {
      ...input,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });

    return PartSupplyPresenter.toDataResponse(partSupply);
  }

  async remove(id: string): Promise<void> {
    await this.deletePartSupplyUseCase.execute(id);
  }

  async updateStock(id: string, input: UpdateStockRequest): Promise<PartSupplyDataResponse> {
    const partSupply = await this.updateStockUseCase.execute(id, input);
    return PartSupplyPresenter.toDataResponse(partSupply);
  }
}
