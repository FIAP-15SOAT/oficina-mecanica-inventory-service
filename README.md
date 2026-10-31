<div align="center">

# Inventory Service

**Catálogo de serviços, peças e insumos, saldo, reservas e movimentações de estoque da oficina mecânica.**

![Node](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
[![Cobertura](https://sonarcloud.io/api/project_badges/measure?project=FIAP-15SOAT_oficina-mecanica-inventory-service&metric=coverage)](https://sonarcloud.io/summary/new_code?id=FIAP-15SOAT_oficina-mecanica-inventory-service)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=FIAP-15SOAT_oficina-mecanica-inventory-service&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=FIAP-15SOAT_oficina-mecanica-inventory-service)

</div>

## Sobre

Serviço NestJS da solução Oficina Mecânica (FIAP 15SOAT), dono do contexto de estoque. É o único cliente do próprio PostgreSQL e do próprio Valkey: nenhum outro serviço lê nem escreve neles.

### Responsabilidade do Inventory

- Dono do catálogo de serviços, peças e insumos, do saldo, das reservas e das movimentações de estoque.
- Consome da fila `inventory.fifo` os comandos `inventory.stock.reserve` (reserva tudo ou nada, idempotente por ordem de serviço) e `inventory.stock.consume` (baixa das reservas) e publica `inventory.stock.reserved` e `inventory.stock.reservation_failed` no tópico `oficina-events.fifo`, sempre por outbox gravado na mesma transação. Detalhes em [Mensageria](docs/messaging.md).
- Lê por id com cache-aside no Valkey (TTL de 12 h, invalidado depois do commit).
- Antes de excluir um serviço ou uma peça, pergunta ao dono dos orçamentos (Work Order, `QUOTE_ITEMS_SERVICE_URL`) se o item está em uso.
- Valida localmente o token RS256 de funcionário emitido pelo Identity e recusa token de cliente.

### O que a API expõe

Rotas de negócio em `/api`, todas com token de funcionário; o contrato completo está em [Referência da API](docs/api.md).

| Recurso | Rotas | Papéis |
| --- | --- | --- |
| Serviços | `POST/GET /api/services`, `GET/PUT/DELETE /api/services/:id` | ADMIN (listagem também ATTENDANT e MECHANIC) |
| Peças e insumos | `POST/GET /api/parts-supplies`, `GET/PUT/PATCH/DELETE /api/parts-supplies/:id` (`PATCH` movimenta o estoque) | ADMIN; listagem também ATTENDANT e MECHANIC; busca por id e `PATCH` também ATTENDANT |
| Movimentações | `GET /api/stock-movements` | ADMIN, ATTENDANT |
| Reservas | `GET /api/stock-reservations` | ADMIN, ATTENDANT |
| Internas (sem token, só no cluster) | `GET /internal/services/:id`, `GET /internal/parts-supplies/:id` | n/a |
| Saúde e Swagger | `GET /api/health/live`, `GET /api/health/ready`, `/api/docs`, `/api/docs-json` | Público |

A reserva e a baixa de estoque só acontecem por mensagem, não por HTTP.

## Stack

- **Runtime**: Node.js 24 + TypeScript 6
- **Framework**: NestJS 12
- **ORM**: Prisma 7 (driver `@prisma/adapter-pg`, client gerado em `app/prisma/generated/`)
- **Banco de dados**: PostgreSQL 18 (catálogo, estoque, reservas, movimentações e `outbox`)
- **Mensageria**: Amazon SNS FIFO + SQS FIFO (`@aws-sdk/client-sns`, `@aws-sdk/client-sqs`, `sqs-consumer`) com outbox transacional; LocalStack 4.14.0 em desenvolvimento
- **Cache**: Valkey 9.1 (ElastiCache no cluster) via `ioredis`, cache-aside
- **Autenticação**: token de funcionário RS256 validado localmente com `passport-jwt`
- **Observabilidade**: logs JSON no stdout (`pino` + `nestjs-pino`) e traces e métricas pelo OpenTelemetry
- **Documentação da API**: Swagger/OpenAPI (`@nestjs/swagger`)
- **Testes**: Jest 30 (unitários com mocks tipados e E2E com Testcontainers: PostgreSQL 18, Valkey 9.1 e LocalStack 4.14.0)
- **Qualidade e segurança**: SonarQube Cloud (SAST) e OWASP ZAP (DAST)
- **Containerização**: Docker (multi-stage `node:24-alpine`) + Docker Compose
- **Linting**: ESLint 9 + Prettier 3

## Pré-requisitos

- Node.js 24.9 ou superior e npm (o `npm ci` deve rodar no Node 24: veja [Testes](docs/testing.md#node-24))
- Docker com Docker Compose
- OpenSSL (para gerar o par de chaves RS256 de teste)
- Git

## Quick start

Toda a aplicação vive em `app/`, sem `package.json` na raiz do repositório: rode os comandos dentro dela.

```bash
# Entrar na pasta da aplicação
cd app

# Copiar as variáveis de ambiente
cp .env.example .env

# Gerar um par RS256 de teste (o serviço só precisa da chave pública)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out staff.pem

# Extrair a chave pública do par
openssl pkey -in staff.pem -pubout -out staff.pub.pem

# Gravar a chave pública no .env, em uma linha, para o docker compose lê-la
node -e "console.log('STAFF_JWT_PUBLIC_KEY=' + JSON.stringify(require('node:fs').readFileSync('staff.pub.pem', 'utf8')))" >> .env

# Apagar os arquivos de chave (a chave privada não deve ficar no disco)
rm staff.pem staff.pub.pem

# Subir PostgreSQL, Valkey, LocalStack, a migração e a API, esperando ficarem saudáveis
docker compose up -d --build --wait

# Conferir a prontidão: 200 {"status":"ok"}
curl -i http://localhost:3003/api/health/ready

# Parar e remover os containers e o volume do banco local
docker compose down -v
```

A exclusão de serviço ou peça consulta o Work Order em `QUOTE_ITEMS_SERVICE_URL`; o compose já aponta para `http://host.docker.internal:3000` (o Work Order rodando na máquina) e, sem ele no ar, a exclusão responde 503 ([detalhes](docs/local-setup.md#api-na-máquina)). Para popular o catálogo local, rode `npm run db:setup` a partir de `app/` com a `DATABASE_URL` do `.env` (o banco do compose escuta em `localhost:5435`).

Depois do `up`, a API responde em `http://localhost:3003` e o Swagger em [`http://localhost:3003/api/docs`](http://localhost:3003/api/docs). O passo a passo completo, com as portas dos demais serviços, está em [Como executar localmente](docs/local-setup.md).

## Comandos

Rode a partir de `app/`.

| Comando | Descrição |
| --- | --- |
| `npm run start:dev` | Inicia em modo watch |
| `npm run build` | Compila o projeto |
| `npm run start:prod` | Inicia o build com o preload de telemetria (`node --require ./dist/src/otel.js dist/src/main`) |
| `npm run lint` | Linting com auto-fix |
| `npm run test` | Testes unitários |
| `npm run test:cov` | Testes unitários com cobertura (falha abaixo de 100%) |
| `npm run test:e2e` | Testes E2E com Testcontainers |
| `npm run test:e2e:cov` | Testes E2E com cobertura |
| `npm run test:smoke` | Confere que o preload de telemetria emite sinais (exige `npm run build`) |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria e aplica migrations (dev) |
| `npm run prisma:migrate:prod` | Aplica migrations (`migrate deploy`) |
| `npm run prisma:seed` | Carrega 25 serviços e 8 peças (`prisma db seed`, idempotente) |
| `npm run db:setup` | `migrate deploy`, `prisma generate` e seed |

## Estrutura

```text
oficina-mecanica-inventory-service/
├── app/
│   ├── src/
│   │   ├── domain/                 # entidades, enums, catálogo de mensagens, exceções e portas de repositório
│   │   ├── application/            # use cases (service, part-supply, stock), portas, chaves de cache, log e métricas
│   │   ├── interface-adapters/     # Clean Controllers e Presenters (service, part-supply, stock)
│   │   ├── infrastructure/         # http, persistence/prisma, messaging, cache, clients, logging, telemetry, health, config
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── otel.ts                 # preload do OpenTelemetry
│   ├── prisma/                     # schema, migrations e seeds
│   ├── localstack/                 # init-topology.sh (tópico, filas e DLQs)
│   ├── test/                       # unit/ (espelha src/), e2e/, smoke/ e helpers/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── sonar-project.properties
├── k8s/                            # manifests aplicados pelo CD
├── collections/                    # collection e environment do Postman
├── docs/
│   ├── adr/                        # decisões arquiteturais
│   ├── c4/                         # C4 nível 3 em PlantUML
│   └── diagrams/                   # arquitetura, sequência de estoque e pipelines
├── .github/workflows/              # CI, CD, SAST e DAST
├── .zap/rules.tsv                  # regras do OWASP ZAP
└── README.md
```

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Arquitetura](docs/architecture.md) | Camadas, agregados, reserva e baixa, mensageria com outbox, cache por id, consulta de uso, Swagger e C4 nível 3 |
| [Referência da API](docs/api.md) | Rotas públicas e internas, papéis, erros e contrato de movimentos e reservas |
| [Mensageria](docs/messaging.md) | Comandos consumidos, eventos publicados, payloads e idempotência |
| [Banco de dados](docs/database.md) | Tabelas, índices, CHECK de saldo, cache e seed |
| [Como executar localmente](docs/local-setup.md) | Setup, variáveis de ambiente e tabela de portas locais por contexto |
| [Testes](docs/testing.md) | Unitários, E2E com Testcontainers, rotas de teste, Postman e Newman |
| [CI/CD](docs/ci-cd.md) | Workflows de CI, CD, SAST e DAST |
| [Modelo C4](docs/c4/README.md) | Componentes do serviço |
| [Collection Postman](collections/inventory-collection.json) e [environment](collections/inventory-environment.json) | Health, Swagger, serviços, peças, estoque e rotas internas, com `baseUrl` única |
| Swagger | `http://localhost:3003/api/docs` (local) e `http://localhost:3003/api/docs-json` |
| [SonarQube Cloud](https://sonarcloud.io/project/overview?id=FIAP-15SOAT_oficina-mecanica-inventory-service) | Projeto `FIAP-15SOAT_oficina-mecanica-inventory-service` |

### ADRs

- [0001 Clean Architecture em camadas](docs/adr/0001-clean-architecture-em-camadas.md)
- [0002 Pipelines de CI, CD, SAST e DAST, com rollback e JWT de teste](docs/adr/0002-pipelines-ci-cd-sast-dast-com-rollback.md)
- [0003 Testes E2E com Testcontainers, Valkey e LocalStack](docs/adr/0003-testcontainers-e2e-com-valkey-e-localstack.md)
- [0004 Credencial do banco materializada no CD](docs/adr/0004-materializacao-da-credencial-do-banco-no-cd.md)
- [0005 Mensageria SNS/SQS FIFO com outbox transacional](docs/adr/0005-mensageria-sns-sqs-fifo-com-outbox.md)
- [0006 Cache do dono no ElastiCache](docs/adr/0006-cache-do-dono-no-elasticache.md)

## Ecossistema de repositórios

Todos na organização [FIAP-15SOAT](https://github.com/FIAP-15SOAT):

| Repositório | Papel |
| --- | --- |
| [`oficina-mecanica-work-order-service`](https://github.com/FIAP-15SOAT/oficina-mecanica-work-order-service) | Serviço Work Order |
| [`oficina-mecanica-identity-service`](https://github.com/FIAP-15SOAT/oficina-mecanica-identity-service) | Serviço Identity (emite o token de funcionário) |
| [`oficina-mecanica-billing-service`](https://github.com/FIAP-15SOAT/oficina-mecanica-billing-service) | Serviço Billing |
| [`oficina-mecanica-inventory-service`](https://github.com/FIAP-15SOAT/oficina-mecanica-inventory-service) | Este serviço |
| [`oficina-mecanica-lambda-customer-auth`](https://github.com/FIAP-15SOAT/oficina-mecanica-lambda-customer-auth) | Lambda de login do cliente |
| [`oficina-mecanica-lambda-notification`](https://github.com/FIAP-15SOAT/oficina-mecanica-lambda-notification) | Lambda de envio de e-mail |
| [`oficina-mecanica-infra-base`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base) | Rede e scripts de ambiente |
| [`oficina-mecanica-infra-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-k8s) | EKS, namespaces, ECR e NLB |
| [`oficina-mecanica-infra-messaging`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-messaging) | SNS e SQS FIFO |
| [`oficina-mecanica-infra-database-inventory`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-database-inventory) | RDS e ElastiCache deste serviço |
| [`oficina-mecanica-api-gateway`](https://github.com/FIAP-15SOAT/oficina-mecanica-api-gateway) | API Gateway |
| [`oficina-mecanica-custom-monitoring`](https://github.com/FIAP-15SOAT/oficina-mecanica-custom-monitoring) | Dashboards e monitores do Datadog |
| [`oficina-mecanica-specs`](https://github.com/FIAP-15SOAT/oficina-mecanica-specs) | Arquitetura e changes OpenSpec |

## Licença

Projeto acadêmico (FIAP, 15SOAT), para fins educacionais. Sem licença aberta declarada (`UNLICENSED`).
