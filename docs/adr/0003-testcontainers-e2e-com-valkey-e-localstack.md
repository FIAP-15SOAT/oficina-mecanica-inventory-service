# ADR 0003: Testes E2E com Testcontainers, incluindo Valkey e LocalStack

## Status

Aceito — 2026-10-29. Herdada do ADR 0015 do Work Order, estendida a Valkey e LocalStack.

## Contexto

Os comportamentos que o kit garante dependem de infraestrutura real: constraints e transações do PostgreSQL (o outbox grava na mesma transação do estado e o relay usa `pg_try_advisory_xact_lock`), o comportamento do cache com Valkey fora do ar e o ciclo de publicação, consumo, redrive e DLQ do SNS/SQS FIFO. Mocks desses três não reproduzem nada disso.

## Decisão

Rodar toda a suíte E2E (`npm run test:e2e`) com Testcontainers, sem mock de infraestrutura: PostgreSQL 18, Valkey 9.1 e, nos testes de mensageria, LocalStack **4.14.0** (fixado) com `app/localstack/init-topology.sh`, cópia da topologia do `oficina-mecanica-infra-messaging`. O `setupTestApp` sobe o `AppModule` com o mesmo `configureApp` do `main.ts`. O SDK da AWS aponta para o LocalStack só por `AWS_ENDPOINT_URL`. O Compose local usa as mesmas versões.

## Alternativas consideradas

| Alternativa | Trade-off | Rever se |
| --- | --- | --- |
| Mockar Prisma, ioredis e o SDK da AWS | Rápido e sem Docker, mas não reproduz transação, lock advisory, FIFO nem DLQ | — |
| Banco, cache e filas compartilhados e persistentes | Sem custo de boot, mas acumula estado entre execuções e pessoas | — |
| LocalStack 2026.x | Versão mais nova, mas exige auth token por pessoa e um token de CI | A comunidade 4.x ficar sem manutenção |
| Redis no lugar do Valkey | Imagem mais conhecida, mas o ElastiCache da solução é Valkey | — |
| Topologia criada pelo próprio teste | Independe do script, mas deixa de provar que o script copiado do infra-messaging funciona | — |

## Consequências

### Positivas

- Detecta regressão de migration, de outbox e de redrive que um mock não vê.
- Qualquer pessoa ou CI com Docker roda a suíte sem provisionar nada.

### Negativas e limites

- Suíte mais lenta (boot de três containers; timeout de 10 minutos em `jest-e2e.json`); o teste de DLQ leva minutos por causa do long polling.
- Exige Docker e o `node_modules` instalado no Node 24 (veja [Testes](../testing.md#node-24)).
- O script do LocalStack é uma cópia e envelhece: o cabeçalho registra a origem e o commit.

## Referências

- [Testes](../testing.md)
- Architecture Spine, AD-19
