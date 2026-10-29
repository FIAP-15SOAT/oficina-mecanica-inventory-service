# ADR 0005: Mensageria SNS/SQS FIFO com outbox transacional

## Status

Aceito — 2026-10-29. Herdada do ADR 0018 do Work Order, adaptada ao Inventory.

## Contexto

O Inventory é dono do próprio PostgreSQL e fala com os outros serviços por mensagem: recebe pedidos de reserva e baixa de estoque e responde com o resultado. O SNS não participa da transação do PostgreSQL, então gravar o estado e publicar em seguida é uma dupla escrita: se o processo cair entre as duas, a mensagem se perde ou o aviso sai de algo desfeito. As mensagens de uma mesma ordem de serviço (OS) precisam chegar em ordem. Algumas mensagens não pertencem a uma OS.

## Decisão

Outbox transacional no PostgreSQL do serviço, relay no próprio processo, um tópico SNS FIFO e uma fila SQS FIFO por consumidor.

1. **Outbox.** A mensagem é uma linha da tabela `outbox`, gravada pelo `IOutboxRepository` na mesma transação do Unit of Work que muda o estado. O tipo e o payload vêm de um catálogo tipado em `domain/messaging/`.
2. **Relay** (`OutboxRelayService`): a cada 500 ms abre uma transação, toma `pg_try_advisory_xact_lock` (só uma réplica publica), lê até 10 linhas por `id`, publica uma a uma e apaga as publicadas na mesma transação. Para na primeira falha, para não furar a ordem.
3. **Tópico e filas.** Um tópico `oficina-events.fifo` para a solução e uma fila por consumidor, com filter policy por atributo `type`. Este serviço consome `inventory.fifo`, com DLQ `inventory-dlq.fifo` e `maxReceiveCount` 5.
4. **`MessageGroupId` = `workOrderId`, ou o `messageId` quando a mensagem não tem OS** (`row.workOrderId ?? row.messageId`, no relay). Com OS, a ordem é por OS. Sem OS, cada mensagem forma o próprio grupo: não há ordem a preservar e uma mensagem com falha não segura as demais. O `MessageDeduplicationId` é o `messageId`.
5. **Envelope** de cinco campos (`messageId`, `type`, `occurredAt`, `workOrderId`, `payload`); correlação e causalidade pelo contexto W3C nos atributos, gravado no outbox (AD-10, AD-18).
6. **Consumidor** (`SqsConsumerService`): uma mensagem por vez, confirma só no sucesso; erro, envelope ou payload inválido e tipo sem handler deixam a mensagem na fila, e na quinta entrega o SQS a manda para a DLQ. Handlers idempotentes.

## Alternativas consideradas

| Alternativa | Trade-off | Rever se |
| --- | --- | --- |
| Publicar no SNS dentro ou logo depois da transação, com retry em memória | Menos código, mas é a dupla escrita e perde ou inventa avisos | — |
| `MessageGroupId` fixo para o serviço inteiro | Ordem total, mas serializa tudo e uma mensagem com falha bloqueia todas | — |
| `MessageGroupId` ausente quando não há OS | Não é aceito pelo SNS FIFO: o grupo é obrigatório | — |
| Grupo constante (por exemplo `no-work-order`) para as mensagens sem OS | Simples, mas junta mensagens independentes num grupo só e uma falha bloqueia as outras | Surgir ordem entre mensagens sem OS |
| Vários relays com `FOR UPDATE SKIP LOCKED` | Publica em paralelo, mas furaria a ordem do grupo entre réplicas | O volume exigir paralelismo |
| Relay como processo ou Job separado | Isola a carga, mas soma deployment, credenciais e ponto de falha | A carga do relay competir com as requisições |
| Filas standard com versão do agregado | Mais vazão, mas toda a checagem de ordem iria para os handlers | A vazão da FIFO limitar |
| Confirmar mensagem sem handler | Fila sem retentativas inúteis, mas um tipo publicado antes do consumidor estar pronto se perderia; a DLQ o guarda para redrive | — |
| Tabela `inbox` | Deduplicação genérica, mas handlers idempotentes por chave de negócio ou estado já cobrem | Um handler não conseguir ser idempotente |

## Consequências

### Positivas

- Nenhuma mudança de estado fica sem aviso, e nenhum aviso sai de estado desfeito.
- Ordem por OS sem código de versão nos handlers; mensagens sem OS não competem entre si.
- O trace segue da requisição que gravou a mensagem até o handler do outro serviço.

### Negativas e limites

- Latência de até cerca de 500 ms entre o commit e a publicação, mais o long polling.
- Uma falha persistente na publicação segura todas as mensagens do serviço, porque o relay para no primeiro erro: `messaging.outbox.publish_failed` precisa de monitor.
- Entrega pelo menos uma vez: todo handler precisa ser idempotente.
- A ordem por OS depende de o produtor travar ou atualizar a linha da OS antes de gravar a mensagem; o código não verifica isso.
- Hoje não há handlers registrados: mensagem `inventory.stock.*` consumida agora vai para a DLQ.

## Referências

- [Arquitetura › Mensageria com outbox](../architecture.md#mensageria-com-outbox)
- Architecture Spine, AD-6 e AD-9
- [AWS — SNS FIFO topics](https://docs.aws.amazon.com/sns/latest/dg/sns-fifo-topics.html)
- [Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)
