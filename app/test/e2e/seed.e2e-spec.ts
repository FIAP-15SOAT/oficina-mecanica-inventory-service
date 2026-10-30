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
});
