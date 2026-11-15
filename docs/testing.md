# Testes

## Índice

- [Unitários](#unitários)
- [E2E](#e2e)
- [Por que os e2e do kit têm rotas de teste](#por-que-os-e2e-do-kit-têm-rotas-de-teste)
- [Node 24](#node-24)
- [Postman e Newman](#postman-e-newman)

## Unitários

Jest 30 com `ts-jest`, em `app/test/unit/`, que espelha `app/src/`. Teste de use case instancia a classe com `jest.Mocked<IRepository>`, sem Nest DI e sem banco. As factories de mock ficam em `app/test/helpers/`.

```bash
# A partir de app/: testes unitários com cobertura
npm run test:cov
```

O `coverageThreshold` global exige 100% de linhas, statements, funções e branches, e o comando falha abaixo disso. É o mesmo lcov (`app/coverage/lcov.info`) que o workflow de SAST envia ao Sonar; o badge do README mostra a cobertura que o Sonar mede dessa execução. Ficam fora da cobertura os módulos Nest, `main.ts`, `otel.ts`, configs, exceções, DTOs e o `prisma.service.ts` (veja `collectCoverageFrom` no `package.json`).

## E2E

Jest com Supertest e **Testcontainers** em `app/test/e2e/`, sem mocks de infraestrutura: PostgreSQL 18, Valkey 9.1 e, nos testes de mensageria, LocalStack 4.14.0 com a topologia real de `app/localstack/init-topology.sh`. O helper `setupTestApp` (`app/test/helpers/test-app.helper.ts`) sobe o `AppModule` com o mesmo `configureApp` do `main.ts`, aplica a migration e, com `withMessaging`, liga o relay e o consumidor de verdade. Requer Docker.

```bash
# A partir de app/: E2E (a primeira execução baixa as imagens, depois usa o cache local)
npm run test:e2e
```

Suítes atuais: autenticação (guard e estratégia RS256), health (incluindo banco e cache indisponíveis e encerramento gracioso), logging, telemetria, filtro de exceções, outbox (relay e `MessageGroupId`), mensageria (consumo, DLQ e propagação de contexto) e as de negócio (serviços, peças, estoque, rotas internas e mensageria de estoque). A suíte de exclusão de serviço e peça (`catalog-delete.e2e-spec.ts`) troca o Billing por um servidor HTTP local que responde `GET /internal/services/:id/quote-usage` e `GET /internal/parts-supplies/:id/quote-usage` com o corpo de `app/test/contracts/billing/internal-quote-usage.json` (item em uso), cópia da fixture que o Billing versiona para essas rotas; as respostas de item livre e fora do formato são montadas no próprio spec. O token de teste é assinado por `app/test/helpers/staff-jwt.helper.ts` com um par RS256 gerado em memória a cada execução; nenhuma chave é versionada.

## Por que os e2e do kit têm rotas de teste

As rotas de negócio têm os próprios e2e (serviços, peças, estoque, rotas internas e mensageria de estoque), mas os comportamentos do kit (autenticação deny-by-default, formato dos erros, log de acesso, traces, encerramento com requisição em andamento) só aparecem numa requisição que passe pelo router, pelos guards, pelos filtros e pelos interceptors. Cada suíte declara no próprio spec um controller que existe só no teste (por exemplo `AuthGuardProbeController` e `TestExceptionController`) e o monta por `setupTestApp({ controllers })`, ao lado do `AppModule`. Assim:

- o código de produção não ganha rota nenhuma só para ser testado;
- o padrão é permanente: os specs do kit continuam iguais e não dependem das regras de negócio;
- um defeito do kit aponta para o kit, não para uma regra de negócio.

## Node 24

Os binários nativos de `node_modules` dependem da versão do Node. Um `node_modules` instalado no Node 22 faz o e2e terminar com **segfault (exit 139)** no Node 24. Se acontecer, reinstale sob o Node 24:

```bash
# A partir de app/: trocar para o Node 24 e reinstalar do zero
source ~/.nvm/nvm.sh && nvm use 24
rm -rf node_modules
npm ci
```

O `engines` do `package.json` exige `node >=24.9`, e o CI roda no Node 24.

## Postman e Newman

Em [`collections/`](../collections) há a collection `inventory-collection.json` e dois environments (Postman v2.1), com health, login, Swagger, serviços, peças e insumos, movimentações e reservas e validações. A mesma collection roda contra o stack local ou contra o ambiente implantado, pelo API Gateway, a porta pública da solução, que encaminha cada prefixo de rota ao serviço dono; para trocar de um para o outro, troque só o environment:

| Environment | Arquivo | Para quê |
| --- | --- | --- |
| **Inventory · Local** | `inventory-environment.json` | O stack local do Inventory, com o Identity e o Billing locais |
| **Inventory · Gateway** | `inventory-gateway-environment.json` | O ambiente implantado, pelo API Gateway |

Os dois diferem só nestas variáveis:

| Variável | Local | Gateway |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3003` | A URL do API Gateway, que muda a cada subida do ambiente; o [manual de demonstração](https://github.com/FIAP-15SOAT/oficina-mecanica-work-order-service/blob/main/docs/demo-manual.md#url-pública-e-variáveis) mostra como lê-la |
| `identityBaseUrl` | `http://localhost:3001`, o Identity local | `{{baseUrl}}`: o gateway encaminha o login ao Identity |
| `healthPath` | `api/health/ready` | `health/inventory`, porque no gateway `/api/health/*` é do Work Order |
| `openApiPath` | `api/docs-json` | `docs/inventory`, porque no gateway `/api/docs-json` é do Work Order |

A pasta Autenticação faz o login do funcionário no Identity com `adminEmail` e `adminPassword` (um `ADMIN` do seed) e grava o token em `authToken`; a collection manda `Authorization: Bearer {{authToken}}`, e só o login, os casos 401, a saúde e o Swagger dispensam o token. Os ids criados pelas requisições ficam no environment durante a execução. As rotas `/internal/...` não estão na collection: o gateway não as expõe, e os testes E2E as cobrem. As exclusões esperam 204, então precisam do Billing, dono dos orçamentos, respondendo à consulta de uso dos itens. Reserva e baixa não têm rota HTTP e são cobertas pelo e2e de mensageria.

**Contra o stack local.** O login precisa do Identity local, com a chave pública dele no `.env` do Inventory; sem o Identity, pule a pasta Autenticação e passe um token de funcionário `ADMIN` assinado com o par RS256 cuja chave pública foi para o `.env` (veja [Como executar localmente](local-setup.md#chave-pública-do-token-de-funcionário)). As exclusões precisam do Billing em `QUOTE_ITEMS_SERVICE_URL` (veja [Como executar localmente](local-setup.md#api-na-máquina)):

```bash
# Subir o stack (a partir de app/) e rodar a collection
docker compose up -d --build --wait
npx --yes newman run ../collections/inventory-collection.json -e ../collections/inventory-environment.json

# Sem o Identity local: as pastas sem login, com o token informado
npx --yes newman run ../collections/inventory-collection.json -e ../collections/inventory-environment.json --env-var authToken=<token ADMIN> --folder "Health" --folder "Swagger" --folder "Gestão de Serviços" --folder "Gestão de Peças e Insumos" --folder "Gestão de Estoque - Relatórios" --folder "Validação"
```

**Contra o ambiente implantado**, com o ambiente no ar:

```bash
# A partir da raiz do repositório: rodar a collection pelo API Gateway
npx --yes newman run collections/inventory-collection.json -e collections/inventory-gateway-environment.json --env-var baseUrl=<URL do API Gateway>
```
