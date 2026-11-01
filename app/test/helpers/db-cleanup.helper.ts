import { PrismaService } from '../../src/infrastructure/persistence/prisma/prisma.service';

/** Empties only the Inventory tables; child tables first, the order the foreign keys need. */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.stockReservation.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.partSupply.deleteMany(),
    prisma.service.deleteMany(),
    prisma.outboxMessage.deleteMany(),
  ]);
}
