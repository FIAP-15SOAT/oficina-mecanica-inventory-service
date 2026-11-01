# ADR 0001: Clean Architecture em camadas, com fronteira livre de framework

## Status

Aceito — 2026-10-29. Herdada do ADR 0009 do Work Order, adaptada ao Inventory.

## Contexto

O Inventory vai concentrar regras de estoque (saldo, reservas, baixa) que precisam ser testáveis sem framework web, sem ORM e sem broker, e capazes de evoluir sem que uma troca de ferramenta as atinja. O serviço nasce do mesmo template dos demais serviços NestJS da solução, e as quatro bases de código precisam ter a mesma forma para o code review comparar com o template.

## Decisão

Clean Architecture com quatro camadas e regra de dependência única (o código aponta só para dentro):

- `domain/`: regras e invariantes, catálogo de mensagens e portas de repositório;
- `application/`: casos de uso, portas de entrada e de saída (`ICache`, `ILogger` e os gateways dos outros serviços);
- `interface-adapters/`: Clean Controllers e Presenters, POJOs sem decorators do NestJS;
- `infrastructure/`: borda HTTP do NestJS, Prisma, mensageria, cache, logging, telemetria e health.

A regra é imposta por ferramenta: a cerca ESLint de `app/eslint.config.mjs` proíbe `@nestjs/*`, `@generated/*` (Prisma) e `@opentelemetry/*` em `domain/`, `application/` e `interface-adapters/`, e só `infrastructure/persistence/prisma/` importa o Prisma. Use cases e Clean Controllers são classes sem `@Injectable`, compostas por `useFactory` no módulo Nest.

## Alternativas consideradas

| Alternativa | Trade-off | Rever se |
| --- | --- | --- |
| Camadas tradicionais (N-tier) com services chamando o Prisma direto | Menos arquivos, mas acopla a regra de estoque ao ORM e exige banco para testar um caso de uso | — |
| Transaction Script nos services | Simples para CRUD, mas as invariantes de saldo e reserva ficariam duplicadas em cada ponto de entrada | O serviço continuar sendo só CRUD |
| Hexagonal com duas camadas (sem `interface-adapters`) | Mais enxuta, mas perde o teste do Clean Controller isolado do NestJS | — |
| Estrutura própria, diferente do template | Livre para otimizar este serviço, mas quebra a comparação com o Work Order no code review e multiplica as formas de manter | — |

## Consequências

### Positivas

- Regra de negócio testada com mocks de interface, sem Nest e sem banco.
- Vazamento de framework vira erro de lint, não surpresa em produção.
- Estrutura igual à dos outros serviços: onboarding e review previsíveis.

### Negativas e limites

- Mais indireção por funcionalidade (porta, caso de uso, Clean Controller, `@Controller`).
- Duplicação aparente de DTOs: o tipo puro em `interface-adapters/` e o DTO decorado em `infrastructure/http/`.
- `interface-adapters/` está vazio até as rotas de negócio chegarem.

## Referências

- [Arquitetura › Camadas](../architecture.md#camadas)
