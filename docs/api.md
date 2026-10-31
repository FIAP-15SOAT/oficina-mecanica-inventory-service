# Referência da API

> A fonte viva do contrato é o **Swagger** em `http://localhost:3003/api/docs` (spec em `/api/docs-json`). Esta página é o resumo legível das rotas.

## Índice

- [Acesso](#acesso)
- [Serviços](#serviços-apiservices)
- [Peças e insumos](#peças-e-insumos-apiparts-supplies)
- [Movimentações e reservas](#movimentações-e-reservas)
- [Rotas internas](#rotas-internas-internal)
- [Formato de resposta](#formato-de-resposta)
- [Erros](#erros)

## Acesso

- **Swagger:** `http://localhost:3003/api/docs`
- **Base URL:** `http://localhost:3003/api` (local). No cluster o serviço responde no próprio listener (NodePort 30083); o API Gateway só publica `GET /health/inventory` e `GET /docs/inventory`, então as rotas de negócio abaixo são servidas pelo Inventory diretamente, sem passar pelo gateway.

Toda rota de `/api` exige `Authorization: Bearer <token>` com o token RS256 de **funcionário** emitido pelo Identity, validado localmente (assinatura, `kid`, `iss`, `aud`, `exp` e `typ = access`). Só as rotas de saúde e o Swagger respondem sem token. Token de cliente, expirado ou assinado por outra chave responde **401**; papel sem permissão na rota responde **403**.

Os papéis são `ADMIN`, `ATTENDANT` e `MECHANIC`.

## Serviços (`/api/services`)

| Método | Rota | Descrição | Papéis | Respostas |
| --- | --- | --- | --- | --- |
| POST | `/` | Cadastrar serviço | ADMIN | 201, 400, 409 (nome repetido), 422 |
| GET | `/` | Listar paginado (filtro `name`) | ADMIN, ATTENDANT, MECHANIC | 200 |
| GET | `/:id` | Buscar por id | ADMIN | 200, 400 (id não UUID), 404 |
| PUT | `/:id` | Atualizar | ADMIN | 200, 400, 404, 409, 422 |
| DELETE | `/:id` | Excluir | ADMIN | 204, 400 (id não UUID), 404, 409 (em uso), 503 |

Corpo de `POST` e `PUT`: `name` (3 a 150 caracteres), `description` (opcional, até 500), `basePrice` (maior que zero) e `estimatedTimeMin` (inteiro maior que zero).

## Peças e insumos (`/api/parts-supplies`)

| Método | Rota | Descrição | Papéis | Respostas |
| --- | --- | --- | --- | --- |
| POST | `/` | Cadastrar peça ou insumo | ADMIN | 201, 400, 409 (SKU repetido), 422 |
| GET | `/` | Consultar estoque paginado (filtros `name`, `sku`, `category`, `lowStock`) | ADMIN, ATTENDANT, MECHANIC | 200, 400 (filtro inválido) |
| GET | `/:id` | Buscar por id (com cache) | ADMIN, ATTENDANT | 200, 400 (id não UUID), 404 |
| PUT | `/:id` | Atualizar dados cadastrais (não altera saldo) | ADMIN | 200, 400, 404, 409 (SKU em uso ou conflito de versão), 422 |
| PATCH | `/:id` | Movimentar estoque manualmente | ADMIN, ATTENDANT | 200, 400, 404, 409 |
| DELETE | `/:id` | Excluir | ADMIN | 204, 400 (id não UUID), 404, 409, 503 |

Corpo de `POST`: `name`, `sku` (até 60), `category` (`PART` ou `SUPPLY`), `unit` (`UN`, `KG`, `L`, `ML`, `M`, `CX`, `PC`, `JG`), `costPrice` e `salePrice` (positivos), e opcionais `description`, `partNumber`, `stock` (inteiro, padrão 0), `minStock` (inteiro, padrão 0) e `expiresAt` (`yyyy-MM-dd`, não pode ser anterior a hoje). `PUT` recebe os mesmos campos sem `stock`.

Resposta de uma peça: `id`, `name`, `description`, `sku`, `partNumber`, `category`, `unit`, `costPrice`, `salePrice`, `stock`, `minStock`, `reservedStock`, `expiresAt`, `createdAt` e `updatedAt`. O saldo disponível é `stock - reservedStock`.

### Movimentação manual (`PATCH /:id`)

Corpo: `type`, `quantity` (inteiro positivo), `reason` e `workOrderId` (UUID v4), os dois últimos opcionais. Cada chamada grava uma movimentação.

| `type` | Efeito | Recusa com 409 |
| --- | --- | --- |
| `ENTRY` | Soma `quantity` ao saldo | nunca |
| `EXIT` | Subtrai `quantity` do saldo | `quantity` maior que o saldo, ou saldo resultante abaixo do reservado |
| `ADJUSTMENT` | Define o saldo como `quantity` | `quantity` abaixo do reservado |

Um conflito de versão concorrente na peça também responde **409**; repita a chamada.

### Exclusão

`DELETE` de serviço ou peça consulta o dono dos orçamentos (Work Order, `QUOTE_ITEMS_SERVICE_URL`) antes de excluir. Responde **409** se o item está em orçamento ou ordem de serviço; no caso da peça, também se há estoque reservado ou se há movimentações e reservas no histórico (a chave estrangeira é `RESTRICT`). Se não for possível confirmar o uso (dono fora do ar por rede ou erro 5xx, 4xx do dono, por exemplo 404 porque a rota ainda não existe, ou corpo fora do formato), responde **503** com a mensagem `Não foi possível confirmar se o item é usado em orçamentos; nada foi excluído, tente novamente mais tarde`, e nada é excluído. O status original do 4xx do dono só aparece no log técnico (`quote_item_usage.rejected`). Enquanto o Work Order não expõe `/internal/services/:id/quote-items` e `/internal/parts-supplies/:id/quote-items`, a exclusão não conclui.

## Movimentações e reservas

| Método | Rota | Descrição | Papéis |
| --- | --- | --- | --- |
| GET | `/api/stock-movements` | Listar movimentações (filtros `partSupplyId`, `workOrderId`, `type`, `startDate`, `endDate`) | ADMIN, ATTENDANT |
| GET | `/api/stock-reservations` | Listar reservas (filtros `partSupplyId`, `workOrderId`) | ADMIN, ATTENDANT |

As datas usam `yyyy-MM-dd`. Os dois aceitam `page` e `limit` e respondem 200, 400 (filtro inválido), 401 e 403. O contrato é reduzido ao que o Inventory possui: cada item traz `id`, `partSupplyId`, o resumo `partSupply` (`id`, `name`, `description`, `sku`, `partNumber`, `category`, `unit`), `workOrderId` (só o id; nulo em movimentação manual sem OS), `quantity` e `createdAt`. A movimentação ainda traz `type` e `reason`. Não há dados da ordem de serviço, do cliente, do veículo nem do usuário: eles pertencem a outros serviços.

Não existe rota HTTP para reservar nem baixar estoque: isso só acontece por [mensagem](messaging.md).

## Rotas internas (`/internal`)

Sem o prefixo `api`, sem token e fora do Swagger: só o tráfego dentro do cluster alcança, e o API Gateway não as publica. Toda chamada leva `x-request-id` e `traceparent`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/internal/services/:id` | Dados de um serviço do catálogo (`{ data }`) |
| GET | `/internal/parts-supplies/:id` | Dados de uma peça, com o saldo (`{ data }`), lidos pelo cache por id |

Respondem 200, 400 (id que não é UUID) e 404. É por elas que os outros serviços guardam só o id e buscam o dado aqui.

## Formato de resposta

Recurso único em `{ data: ... }`; lista em `{ data: [...], pagination: { totalRecords, totalPages, page, limit } }`. `page` tem padrão 1 e mínimo 1; `limit` tem padrão 10, mínimo 1 e máximo 100. Datas saem em ISO 8601 com fuso. As rotas de saúde (`/api/health/live` e `/api/health/ready`) devolvem só `{ "status": "ok" }` ou `{ "status": "unavailable" }`.

## Erros

O corpo é `{ "statusCode": 409, "error": "Conflict", "message": "..." }`, com mensagem em português e sem detalhe de infraestrutura. Validação de formato (DTO) responde 400, com `message` em lista; regra de domínio inválida responde 422; violação de regra de negócio e conflito de versão respondem 409; ausência responde 404; dono dos orçamentos indisponível responde 503.
