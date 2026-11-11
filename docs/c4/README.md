# 🧩 Modelo C4 — Inventory Service

Este diretório documenta a API do Inventory com o [modelo C4](https://c4model.com), uma forma de descrever a arquitetura em níveis de zoom (contexto, containers, componentes e código). Aqui fica o nível de Componente: as peças internas do container **API do Inventory** e como elas se ligam ao banco, ao cache, à mensageria e aos outros serviços da oficina (Billing e Work Order).

## Índice

- [Convenções](#convenções)
- [Nível 3 — Componente da API do Inventory](#nível-3--componente-da-api-do-inventory)
- [Documentação relacionada](#documentação-relacionada)

## Convenções

- **Tipo explícito em todo elemento.** Cada elemento declara o tipo entre colchetes (`[Pessoa]`, `[Sistema Externo]`, `[Container Externo: tecnologia]`, `[Componente: tecnologia]`).
- **Ícone de componente.** Cada componente leva o ícone UML clássico (dois retângulos), na paleta azul dos demais elementos.
- **Tecnologia só ao cruzar fronteira.** As setas entre componentes do mesmo container não levam tecnologia; ela aparece nas relações com o funcionário, o Kubernetes, o banco, o cache, a mensageria e os outros serviços (Billing e Work Order).
- **Imagem com o fonte.** A imagem é gerada pelo PlantUML, ferramenta que desenha diagramas a partir de texto, com a biblioteca [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) v2.14.0, e o fonte do diagrama fica embutido no próprio PNG.

## Nível 3 — Componente da API do Inventory

<p align="center"><img src="images/c4-component.png" alt="Diagrama de Componente C4 da API do Inventory: o Funcionário apresenta o token de funcionário ao componente Guards/Segurança, que encaminha as rotas do catálogo ao Catálogo e as de estoque ao Estoque; o Billing chama as Rotas Internas, que usam os casos de uso do Catálogo; o Catálogo consulta o uso de item em orçamento pelos Gateways, que chamam o Billing; o Work Order publica no tópico os comandos de reserva e baixa; a Mensageria consome a fila inventory.fifo, entrega a reserva e a baixa ao Estoque e publica o outbox no SNS; Catálogo e Estoque gravam pelos Repositories no PostgreSQL e usam o Cache sobre o ElastiCache Valkey; o Kubernetes consulta o Health, que verifica o banco" width="100%"></p>

O **Catálogo** reúne os Clean Controllers e os casos de uso de serviços e de peças e insumos. O **Estoque** reúne a consulta de movimentações e reservas e os casos de uso de reserva e baixa. Destaques do fluxo:

- o **Funcionário** apresenta o token emitido pelo Identity ao **Guards / Segurança**, que o valida pela chave pública, sem consultar outro serviço;
- o **Billing** lê o preço e os dados dos itens pelas **Rotas Internas**, sem token, pela rede do cluster;
- antes de excluir um serviço ou uma peça, o **Catálogo** pergunta pelos **Gateways** ao **Billing**, dono dos orçamentos, se o item está em uso em orçamento (endereço em `QUOTE_ITEMS_SERVICE_URL`);
- o **Work Order** publica no tópico os comandos de reserva e baixa da Saga dele (a sequência de passos entre serviços, orquestrada por ele), e a **Mensageria** os lê da fila `inventory.fifo` e os entrega ao **Estoque**;
- o **Estoque** grava o resultado no outbox (a tabela onde a mensagem é gravada na mesma transação do dado), e a Mensageria o publica no tópico.

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| **Guards / Segurança** | NestJS Guards | `AuthenticationGuard` global que nega por padrão (exige o token de funcionário em toda rota, salvo as marcadas com `@Public()`), `JwtStrategy` RS256 pela chave pública e `RolesGuard` (controle de acesso por papel) |
| **Rotas Internas** | NestJS Controller | `GET /internal/services/:id` e `GET /internal/parts-supplies/:id`, `@Public()`, fora do prefixo `api` e do Swagger |
| **Health** | NestJS Module | `GET /api/health/live` sem I/O e `GET /api/health/ready` com `SELECT 1`, consumidas pelas probes (verificações periódicas) do Kubernetes |
| **Catálogo** | Clean Controllers · Use Cases | Cadastro, consulta, alteração e exclusão de serviços e de peças e insumos, e o ajuste manual de estoque de uma peça |
| **Estoque** | Clean Controllers · Use Cases | Consulta de movimentações e reservas, reserva de estoque por ordem de serviço e baixa do que foi reservado |
| **Gateways** | @nestjs/axios | `QuoteUsageGateway` sobre o `InternalHttpClient`, que consulta o uso de item em orçamento com prazo de 2 s, `x-request-id` e `traceparent` |
| **Mensageria** | NestJS Module · AWS SDK | Relay do outbox (rotina que lê o outbox e publica) para o SNS FIFO e consumidor da fila SQS `inventory.fifo`, com o span `CONSUMER` e os handlers de `inventory.stock.reserve` e `inventory.stock.consume` |
| **Repositories** | Prisma | Catálogo, saldo, reservas e movimentações, peças com `version` (controle de concorrência otimista), Unit of Work e outbox gravado na mesma transação da mudança de estado |
| **Cache** | NestJS Module · ioredis | Porta `ICache` sobre o Valkey, no padrão cache-aside (lê do cache e, na falta, do banco) para serviço e peça por id, que falha aberto: com o cache fora do ar, a leitura vai ao banco |

| Elemento externo | Tipo | Papel |
|---|---|---|
| **Funcionário** | Pessoa | Administrador, mecânico ou atendente, com o token emitido pelo Identity |
| **Billing** | Sistema externo | Dono dos orçamentos: lê o preço e os dados dos itens do catálogo e responde se um item está em uso em orçamento |
| **Work Order** | Sistema externo | Dono das ordens de serviço: publica no tópico os comandos de reserva e baixa |
| **Kubernetes** | Sistema externo | Executa as probes de inicialização, vivacidade e prontidão do pod |
| **Banco de Dados** | Container externo | Amazon RDS PostgreSQL 18 do Inventory, com `services`, `parts_supplies`, `stock_movements`, `stock_reservations` e `outbox` |
| **Cache Distribuído** | Container externo | Amazon ElastiCache Valkey 9.1 do Inventory (Valkey é o banco em memória compatível com Redis) |
| **Mensageria AWS** | Container externo | Tópico SNS FIFO `oficina-events.fifo`, fila SQS FIFO `inventory.fifo` e a DLQ `inventory-dlq.fifo` (a fila que guarda as mensagens que falharam 5 vezes) |

## Documentação relacionada

- [Arquitetura](../architecture.md)
- [Mensageria](../messaging.md)
- [ADR 0005 — Mensageria SNS/SQS FIFO com outbox](../adr/0005-mensageria-sns-sqs-fifo-com-outbox.md)
- [ADR 0006 — Cache do dono no ElastiCache](../adr/0006-cache-do-dono-no-elasticache.md)
