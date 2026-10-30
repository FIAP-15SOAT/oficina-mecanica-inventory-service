import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  ConsumeReservedStockInput,
  IConsumeReservedStockUseCase,
} from '@application/ports/input/stock/consume-reserved-stock.use-case.interface';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';

export class ConsumeReservedStockUseCase implements IConsumeReservedStockUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly cache: ICache,
    private readonly logger: ILogger,
  ) {}

  async execute({
    workOrderId,
  }: ConsumeReservedStockInput): Promise<{ consumedItemCount: number }> {
    const consumedPartIds = await this.unitOfWork.executeTransaction((repos) =>
      this.consume(repos, workOrderId),
    );

    // No reservations means the work order was already consumed, so a repeat has no effect.
    if (consumedPartIds.length === 0) {
      return { consumedItemCount: 0 };
    }

    this.logger.event(BUSINESS_EVENTS.STOCK_CONSUMED, {
      workOrderId,
      consumedItemCount: consumedPartIds.length,
    });

    await this.cache.delete(consumedPartIds.map((id) => inventoryCacheKeys.partSupply(id)));

    return { consumedItemCount: consumedPartIds.length };
  }

  private async consume(repos: IRepositories, workOrderId: string): Promise<string[]> {
    const reservations = await repos.stockReservation.findByWorkOrderId(workOrderId);

    if (reservations.length === 0) {
      return [];
    }

    const quantities = new Map<string, number>();

    for (const { partSupplyId, quantity } of reservations) {
      quantities.set(partSupplyId, (quantities.get(partSupplyId) ?? 0) + quantity);
    }

    // The balance comes from PostgreSQL inside the transaction, never from the cache.
    const partSupplies = new Map<string, PartSupply>(
      (await repos.partSupply.findByIds([...quantities.keys()])).map((part) => [part.id, part]),
    );

    const movements: StockMovement[] = [];

    // Sequential: a version conflict aborts the whole transaction before the next update.
    for (const [partSupplyId, quantity] of quantities) {
      const part = partSupplies.get(partSupplyId) as PartSupply;

      part.consumeReserved(quantity);
      await repos.partSupply.update(part);

      movements.push(
        StockMovement.create({
          partSupplyId,
          workOrderId,
          type: StockMovementType.EXIT,
          quantity,
          reason: `Saída por Ordem de Serviço ${workOrderId}`,
        }),
      );
    }

    await repos.stockMovement.createMany(movements);
    await repos.stockReservation.deleteByWorkOrderId(workOrderId);

    return [...quantities.keys()];
  }
}
