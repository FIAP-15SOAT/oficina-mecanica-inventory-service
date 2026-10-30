import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { MessagePayloads } from '@domain/messaging/message-catalog';
import {
  IReserveStockUseCase,
  ReserveStockInput,
  ReserveStockOutcome,
} from '@application/ports/input/stock/reserve-stock.use-case.interface';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { IMetrics } from '@application/ports/output/metrics.service.interface';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { BUSINESS_METRICS } from '@application/metrics/business-metric.catalog';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';

type MissingItem = MessagePayloads['inventory.stock.reservation_failed']['missing'][number];

type Decision =
  | { outcome: 'republished' }
  | { outcome: 'insufficient'; missing: MissingItem[] }
  | { outcome: 'reserved'; reservations: StockReservation[] };

export class ReserveStockUseCase implements IReserveStockUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly cache: ICache,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
  ) {}

  async execute(input: ReserveStockInput): Promise<{ outcome: ReserveStockOutcome }> {
    const { workOrderId, quoteId } = input;

    const decision = await this.unitOfWork.executeTransaction((repos) => this.decide(repos, input));

    // A redelivered command only republishes an earlier decision, so it is not counted again.
    if (decision.outcome === 'republished') {
      return { outcome: 'reserved' };
    }

    this.metrics.increment(BUSINESS_METRICS.STOCK_RESERVATION, { outcome: decision.outcome });

    if (decision.outcome === 'insufficient') {
      this.logger.event(BUSINESS_EVENTS.STOCK_RESERVATION_FAILED, {
        workOrderId,
        quoteId,
        missingItemCount: decision.missing.length,
      });

      return { outcome: 'insufficient' };
    }

    const { reservations } = decision;

    this.logger.event(BUSINESS_EVENTS.STOCK_RESERVED, {
      workOrderId,
      quoteId,
      reservedItemCount: reservations.length,
      reservedQuantity: reservations.reduce((total, item) => total + item.quantity, 0),
    });

    await this.cache.delete(
      reservations.map((reservation) => inventoryCacheKeys.partSupply(reservation.partSupplyId)),
    );

    return { outcome: 'reserved' };
  }

  private async decide(
    repos: IRepositories,
    { workOrderId, quoteId, items }: ReserveStockInput,
  ): Promise<Decision> {
    const existing = await repos.stockReservation.findByWorkOrderId(workOrderId);

    if (existing.length > 0) {
      await repos.outbox.add({
        type: 'inventory.stock.reserved',
        workOrderId,
        payload: { quoteId },
      });

      return { outcome: 'republished' };
    }

    const requested = new Map<string, number>();

    for (const { partSupplyId, quantity } of items) {
      requested.set(partSupplyId, (requested.get(partSupplyId) ?? 0) + quantity);
    }

    // The balance comes from PostgreSQL inside the transaction, never from the cache.
    const partSupplies = new Map<string, PartSupply>(
      (await repos.partSupply.findByIds([...requested.keys()])).map((part) => [part.id, part]),
    );

    const missing: MissingItem[] = [];

    for (const [partSupplyId, quantity] of requested) {
      const part = partSupplies.get(partSupplyId);
      const available = part ? part.stock - part.reservedStock : 0;

      if (available < quantity) {
        missing.push({ partSupplyId, requested: quantity, available });
      }
    }

    if (missing.length > 0) {
      await repos.outbox.add({
        type: 'inventory.stock.reservation_failed',
        workOrderId,
        payload: { quoteId, missing },
      });

      return { outcome: 'insufficient', missing };
    }

    const reservations: StockReservation[] = [];

    // Sequential: a version conflict aborts the whole transaction before the next update.
    for (const [partSupplyId, quantity] of requested) {
      const part = partSupplies.get(partSupplyId) as PartSupply;

      part.reserve(quantity);
      await repos.partSupply.update(part);

      reservations.push(StockReservation.create({ partSupplyId, workOrderId, quantity }));
    }

    await repos.stockReservation.createMany(reservations);
    await repos.outbox.add({ type: 'inventory.stock.reserved', workOrderId, payload: { quoteId } });

    return { outcome: 'reserved', reservations };
  }
}
