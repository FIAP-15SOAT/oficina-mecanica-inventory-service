# Banco de dados

PostgreSQL 18, só deste serviço, definido em [`app/prisma/schema.prisma`](../app/prisma/schema.prisma) e versionado em [`app/prisma/migrations/`](../app/prisma/migrations/). Os tipos abaixo são os do PostgreSQL gerados pelas migrations.

## Tabelas

| Tabela | Conteúdo | Chaves e índices |
| --- | --- | --- |
| `services` | Catálogo de serviços: `name` (150), `description`, `base_price` (`DECIMAL(10,2)`), `estimated_time_min` (padrão 60) | PK `id` (UUID); único em `name` |
| `parts_supplies` | Peças e insumos: `name`, `description`, `sku` (60), `part_number`, `category`, `unit`, `cost_price`, `sale_price`, `stock`, `min_stock`, `reserved_stock`, `version`, `expires_at` | PK `id`; único em `sku`; CHECK de saldo |
| `stock_movements` | Histórico de entradas, saídas e ajustes: `part_supply_id`, `work_order_id` (nulo em movimentação manual sem OS), `type`, `quantity`, `reason` (255) | PK `id`; índices `(part_supply_id, created_at)` e `(work_order_id)`; FK `RESTRICT` para `parts_supplies` |
| `stock_reservations` | Reserva de uma peça para uma OS: `part_supply_id`, `work_order_id`, `quantity` | PK `id`; índices `(part_supply_id)` e `(work_order_id)`; FK `RESTRICT` para `parts_supplies` |
| `outbox` | Mensagens a publicar, apagadas pelo relay depois de publicadas | PK `id` (`BIGSERIAL`); único em `message_id`; ver [Arquitetura](architecture.md#mensageria-com-outbox) |

Enums: `StockMovementType` (`ENTRY`, `EXIT`, `ADJUSTMENT`), `Unit` (`UN`, `KG`, `L`, `ML`, `M`, `CX`, `PC`, `JG`) e `PartSupplyCategory` (`PART`, `SUPPLY`). Datas são `TIMESTAMPTZ(3)`.

## Regras garantidas pelo banco

- **CHECK `parts_supplies_stock_check`:** `stock >= reserved_stock AND reserved_stock >= 0`. O Prisma não declara CHECK, então ele vive em SQL bruto na migration `add_catalog_and_stock`. Mesmo um bug de aplicação não consegue reservar além do saldo.
- **`work_order_id` sem chave estrangeira.** A ordem de serviço pertence ao Work Order: aqui ela é só um UUID, e o serviço nunca lê nem replica a entidade dele.
- **Concorrência otimista:** `version` em `parts_supplies` sobe a cada atualização de saldo; uma escrita com versão velha falha e a API responde 409.
- **Exclusão protegida:** as FKs `RESTRICT` impedem excluir uma peça com movimentações ou reservas.

## Cache

Cache-aside por id no Valkey, só do dono: `inventory:service:<id>` e `inventory:part-supply:<id>`, TTL de 12 h (`CACHE_TTL_SECONDS`, padrão 43200), formato com `cacheVersion`. A leitura por id (`GET /:id` e a rota interna) usa o cache; reserva, baixa e exclusão leem o saldo no PostgreSQL dentro da transação. Toda escrita invalida a chave **depois do commit**.

## Seed

`npm run prisma:seed` (`prisma db seed`) carrega 25 serviços e 8 peças com os ids canônicos compartilhados entre os serviços. É idempotente: serviço existente (chave `name`) tem descrição, preço e tempo atualizados; peça existente (chave `sku`) nunca é alterada, para não sobrescrever saldo movimentado por reservas. `npm run db:setup` aplica as migrations, gera o client e roda o seed. No cluster, o Job `DB Migrate & Seed` roda `prisma migrate deploy` e depois `prisma db seed`.
