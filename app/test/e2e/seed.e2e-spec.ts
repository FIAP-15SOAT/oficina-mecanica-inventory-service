import { execSync } from 'node:child_process';
import { join } from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { PrismaClient } from '@generated/client';

import { SEED_IDS } from '../../prisma/seeds/seed-ids';

describe('Catalog seed (E2E)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let env: NodeJS.ProcessEnv;

  const appDir = join(__dirname, '..', '..');

  function run(command: string): void {
    execSync(command, { cwd: appDir, env, stdio: 'pipe' });
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('seed_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    const databaseUrl = container.getConnectionUri();
    env = { ...process.env, DATABASE_URL: databaseUrl };
    prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

    run('npx prisma migrate deploy');
    run('npx prisma db seed');
    run('npx prisma db seed');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('creates the 25 services with the canonical ids, once', async () => {
    const services = await prisma.service.findMany();

    expect(services).toHaveLength(25);
    for (const [name, id] of Object.entries(SEED_IDS.services)) {
      expect(services.find((service) => service.name === name)?.id).toBe(id);
    }
  });

  it('creates the 8 part supplies with the canonical ids, once', async () => {
    const parts = await prisma.partSupply.findMany();

    expect(parts).toHaveLength(8);
    for (const [sku, id] of Object.entries(SEED_IDS.partSupplies)) {
      expect(parts.find((part) => part.sku === sku)?.id).toBe(id);
    }
  });

  it('starts every part with no reservation at version 1', async () => {
    const parts = await prisma.partSupply.findMany();

    expect(parts.every((part) => part.reservedStock === 0 && part.version === 1)).toBe(true);
  });

  it('does not overwrite the stock of an existing part on a new seed', async () => {
    const sku = 'FILT-OL-001';
    await prisma.partSupply.update({ where: { sku }, data: { stock: 7 } });

    run('npx prisma db seed');

    const part = await prisma.partSupply.findUniqueOrThrow({ where: { sku } });
    expect(part.stock).toBe(7);
    expect(await prisma.partSupply.count()).toBe(8);
    expect(await prisma.service.count()).toBe(25);
  });

  it('does not overwrite or fail on edited, renamed or re-keyed rows', async () => {
    const [editedName, renamedName] = Object.keys(SEED_IDS.services);
    const sku = 'OLEO-5W30-1L';
    await prisma.service.update({
      where: { name: editedName },
      data: { basePrice: 999, description: 'Edited' },
    });
    await prisma.service.update({ where: { name: renamedName }, data: { name: 'Renamed' } });
    await prisma.partSupply.update({ where: { sku }, data: { sku: 'CHANGED-SKU' } });

    run('npx prisma db seed');

    const edited = await prisma.service.findUniqueOrThrow({ where: { name: editedName } });
    expect(Number(edited.basePrice)).toBe(999);
    expect(edited.description).toBe('Edited');
    expect(await prisma.service.findUnique({ where: { name: 'Renamed' } })).not.toBeNull();
    expect(await prisma.service.count()).toBe(25);
    expect(await prisma.partSupply.findUnique({ where: { sku: 'CHANGED-SKU' } })).not.toBeNull();
    expect(await prisma.partSupply.count()).toBe(8);
  });

  it('does not fail or overwrite when a seeded item was deleted and another took its name or SKU', async () => {
    const name = Object.keys(SEED_IDS.services)[2];
    const sku = 'VELA-IG-001';
    await prisma.service.delete({ where: { name } });
    const replacementService = await prisma.service.create({
      data: { name, basePrice: 1, estimatedTimeMin: 5 },
    });
    await prisma.partSupply.delete({ where: { sku } });
    const replacementPart = await prisma.partSupply.create({
      data: { name: 'Replacement', sku, category: 'PART', costPrice: 1, salePrice: 2, stock: 3 },
    });

    run('npx prisma db seed');

    const service = await prisma.service.findUniqueOrThrow({ where: { name } });
    expect(service.id).toBe(replacementService.id);
    expect(service.id).not.toBe(SEED_IDS.services[name]);
    expect(Number(service.basePrice)).toBe(1);
    expect(await prisma.service.count()).toBe(25);
    const part = await prisma.partSupply.findUniqueOrThrow({ where: { sku } });
    expect(part.id).toBe(replacementPart.id);
    expect(part.name).toBe('Replacement');
    expect(await prisma.partSupply.count()).toBe(8);
  });

  it('recreates a seeded item deleted by the admin when its name and SKU are free', async () => {
    const name = Object.keys(SEED_IDS.services)[3];
    const sku = 'BAT-60AH-001';
    await prisma.service.delete({ where: { name } });
    await prisma.partSupply.delete({ where: { sku } });

    run('npx prisma db seed');

    expect((await prisma.service.findUniqueOrThrow({ where: { name } })).id).toBe(
      SEED_IDS.services[name],
    );
    expect((await prisma.partSupply.findUniqueOrThrow({ where: { sku } })).id).toBe(
      SEED_IDS.partSupplies[sku],
    );
  });
});
