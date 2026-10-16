# Notifly

> API de envio e gestão de notificações **assíncrona e multi-canal** — construída com NestJS, PostgreSQL (Prisma), Redis e BullMQ, com padrão **Transactional Outbox**.

O Notifly recebe pedidos de notificação (e-mail, SMS, push), persiste-os de forma atômica e os processa em segundo plano através de uma fila, notificando sistemas externos sobre o resultado via webhooks.

> Projeto em **desenvolvimento**.

---

## Sumário

- [Visão geral / Funcionalidade](#-visão-geral--funcionalidade)
- [Arquitetura](#-arquitetura)
- [Stacks e tecnologias](#-stacks-e-tecnologias)
- [Tomada de decisão](#-tomada-de-decisão)
- [Problemas resolvidos e soluções](#-problemas-resolvidos-e-soluções)
- [Como rodar](#-como-rodar)
- [Endpoints da API](#-endpoints-da-api)
- [Modelo de dados](#-modelo-de-dados)
- [Testes](#-testes)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Melhorias futuras](#-melhorias-futuras)

---

## Visão geral / Funcionalidade

O fluxo central da aplicação:

1. **Autenticação** — o usuário registra-se (`/auth/register`) ou faz login (`/auth/login`) e recebe um par de tokens. Integrações máquina-a-máquina podem usar chaves de API.
2. **Envio de notificação** — o cliente chama `POST /notifications/send`. A API **não envia na hora**: grava a `Notification` com status `QUEUED` e um `OutboxEvent` na **mesma transação** e responde `202 Accepted` imediatamente.
3. **Despacho (Outbox Publisher)** — um job agendado varre a tabela `outbox_events`, publica os eventos pendentes na fila BullMQ e os marca como `DISPATCHED`.
4. **Processamento (Worker)** — um `WorkerHost` consome a fila, executa o envio, atualiza o status da notificação para `SENT` ou `FAILED` e dispara webhooks de `notification.sent` / `notification.failed`.
5. **Webhooks** — clientes assinam URLs (`POST /webhooks/subscription`). Cada entrega é persistida e entregas falhas são reprocessadas periodicamente.

### Recursos principais

- Processamento **assíncrono** com fila e política de **retry**.
- **Transactional Outbox** para evitar inconsistência entre banco e fila.
- **Webhooks** assinados e com histórico de entregas.
- **Multi-canal**: `EMAIL`, `SMS`, `PUSH` (envio simulado, pronto para plugar provedores reais).
- **Rate limiting** global e por rota.
- **Validação** de entrada (DTOs) e de ambiente no boot.
- **Paginação e filtros** na listagem de notificações.

---

## Arquitetura

Arquitetura **modular em camadas** (Controller → Service → Prisma), com componentes assíncronos desacoplados via fila. Padrão de resiliência **Outbox + Worker**.

```
                         ┌─────────────────────────────────────────────┐
   HTTP Request          │                  NestJS API                 │
  (autenticado) ───────► │  Guards → Interceptors → Pipes → Controller │
                         └───────────────────────┬─────────────────────┘
                                                 │  (transação atômica)
                                                 ▼
                                   ┌──────────────────────────┐
                                   │        PostgreSQL        │
                                   │  Notification (QUEUED)   │
                                   │  OutboxEvent  (PENDING)  │
                                   └────────────┬─────────────┘
                                                │
                        ┌───────────────────────┘
                        │   @Cron (OutboxPublisherService)
                        ▼
                  ┌───────────┐        publica        ┌───────────────┐
                  │  Redis    │◄──────────────────────│  BullMQ Queue │
                  │ (BullMQ)  │                       └───────┬───────┘
                  └─────┬─────┘                               │
                        │  consome (WorkerHost)               │
                        ▼                                     │
              ┌────────────────────────┐                      │
              │ NotificationProcessor  │──────────────────────┘
              │  NotificationSender    │   envia + atualiza status
              └───────────┬────────────┘
                          │ dispara evento
                          ▼
              ┌────────────────────────┐
              │   WebhooksService      │──► POST ──► Cliente
              │  + retry @Cron         │
              └────────────────────────┘
```

### Camadas

| Camada | Responsabilidade | Exemplos |
|--------|------------------|----------|
| **Controllers** | Entrada HTTP, validação via DTO | `AuthController`, `NotificationsController` |
| **Services** | Regra de negócio | `NotificationsService`, `WebhooksService`, `TokenService` |
| **Guards** | Autenticação / autorização | `JwtAuthGuard`, `ApiKeyGuard`, `AdminGuard`, `OwnershipGuard` |
| **Interceptors** | Log e padronização de resposta | `LoggingInterceptor`, `TransformInterceptor` |
| **Filters** | Tratamento global de erros | `AllExceptionsFilter` |
| **Infra** | Persistência e fila | `PrismaService`, BullMQ `Queue`/`WorkerHost` |
| **Schedulers** | Jobs recorrentes | `OutboxPublisherService`, `WebhooksService.retryFailedDeliveries` |

---

## Stacks e tecnologias

| Categoria | Tecnologia |
|-----------|------------|
| Framework | **NestJS 12** |
| Linguagem | **TypeScript** (ESM / `nodenext`) |
| ORM / Banco | **Prisma 6** + **PostgreSQL 15** |
| Fila / Cache | **Redis 7** + **BullMQ 6** |
| Auth | Passport (`passport-jwt`, `passport-local`), `@nestjs/jwt`, bcrypt |
| Validação | `class-validator`, `class-transformer`, **Joi** (env) |
| HTTP client | `@nestjs/axios` (Axios) |
| Agendamento | `@nestjs/schedule` (cron) |
| Config | `@nestjs/config` + `dotenv` |
| Testes | **Vitest** + `@nestjs/testing` |
| Qualidade | **oxlint**, Prettier |
| Container | Docker + Docker Compose (PostgreSQL/Redis) |

---

## Tomada de decisão

Registros das principais escolhas de engenharia e o *porquê*.

### 1. Envio assíncrono via fila em vez de síncrono
Chamar um provedor externo dentro do ciclo da requisição aumenta latência e acopla a disponibilidade da API à do provedor. **Decisão:** registrar a intenção e processar em background com BullMQ, respondendo `202 Accepted`. O cliente acompanha o status por `GET /notifications/:id`.

### 2. Transactional Outbox em vez de publicar direto na fila
Publicar no Redis e gravar no Postgres são duas operações distintas — uma pode falhar e gerar inconsistência (*dual-write*). **Decisão:** gravar `Notification` + `OutboxEvent` numa **única transação Prisma**; um publicador lê a outbox e enfileira. Se o Redis cair, o evento permanece `PENDING` e é reenviado na próxima varredura.

### 3. Redis + BullMQ
BullMQ fornece *jobs* atrasados, tentativas e backoff prontos — evitando reimplementar retry/agendamento manualmente.

### 4. Prisma como ORM
Schema declarativo, migrações versionadas e **transações interativas** (`$transaction`) foram decisivas para implementar a outbox com tipagem forte.

### 5. Autenticação com JWT e chaves de API
Sessões de usuário com JWT e chaves de API para integrações. As rotas são privadas por padrão e liberadas explicitamente quando necessário.

### 6. Validação de ambiente no boot
A aplicação valida as variáveis de ambiente obrigatórias ao iniciar e **não sobe** se algo essencial estiver faltando — falhar cedo evita erros durante uma requisição.

### 7. Resposta padronizada
`TransformInterceptor` envolve toda resposta em `{ data, statusCode }` e `AllExceptionsFilter` concentra o tratamento de erros num contrato único — previsível para o consumidor.

### 8. ESM nativo (`type: module` + `nodenext`)
Escolha moderna de módulos; por isso os imports internos usam a extensão `.js` mesmo em arquivos `.ts`.

---

## Problemas resolvidos e soluções

| # | Problema | Solução implementada |
|---|----------|----------------------|
| 1 | **Envio síncrono** tornava a API lenta e frágil a falhas do provedor | Fila BullMQ + resposta `202 Accepted`; processamento em `NotificationProcessor` |
| 2 | **Dual-write**: gravar no banco e enfileirar podia divergir | **Transactional Outbox**: `Notification` + `OutboxEvent` na mesma `$transaction` |
| 3 | Eventos presos quando o Redis cai | `OutboxPublisherService` reenvia `PENDING`; marca `DISPATCHED`/`FAILED` |
| 4 | Falhas temporárias no envio | BullMQ com tentativas e **backoff exponencial** |
| 5 | **Jobs duplicados** ao republicar o mesmo evento | `jobId: event.id` garante idempotência no enfileiramento |
| 6 | Webhooks sem garantia de entrega | Persistência em `WebhookDelivery` + cron de retry |
| 7 | Concorrência entre execuções do cron | Flag `isProcessing` no `OutboxPublisherService` evita varreduras sobrepostas |
| 8 | Dados sensíveis retornados nas respostas | Seleção explícita de campos nas consultas |
| 9 | Configuração incompleta só descoberta em runtime | Validação de ambiente no boot |
| 10 | Abuso / força bruta em endpoints sensíveis | **Rate limiting** global e por rota |
| 11 | Erros inconsistentes para o cliente | `AllExceptionsFilter` padroniza as respostas de erro |
| 12 | Payloads com campos inesperados | `ValidationPipe` com `whitelist` e rejeição de campos extras |

---

## Como rodar

### Pré-requisitos
- Node.js 22+ e npm
- Docker + Docker Compose (para PostgreSQL e Redis)

### 1. Instalar dependências

```bash
npm install
```

> O `postinstall` já executa `prisma generate` automaticamente.

### 2. Configurar o ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais locais (PostgreSQL, Redis e segredos da aplicação).

### 3. Subir os serviços (PostgreSQL + Redis)

```bash
docker compose up -d
```

> A API roda localmente (próximo passo). O serviço `app` do Compose fica sob o profile `full` — para rodar **tudo** em Docker: `docker compose --profile full up -d --build`.

### 4. Aplicar migrações do Prisma

```bash
npx prisma migrate dev
```

### 5. Subir a aplicação em desenvolvimento

```bash
npm run start:dev
```

A API estará disponível em `http://localhost:3000`.

### Scripts úteis

| Script | Descrição |
|--------|-----------|
| `npm run start:dev` | Inicia em modo desenvolvimento com `--watch` |
| `npm run lint` | Analisa o código com oxlint |
| `npm run format` | Formata com Prettier |
| `npm run test` | Executa os testes unitários |
| `npm run test:watch` | Testes em watch mode |
| `npm run test:cov` | Relatório de cobertura |
| `npm run test:integration` | Testes de integração com Testcontainers (Docker) |

---

## Endpoints da API

Base: `http://localhost:3000`

### Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/register` | Registra usuário e retorna tokens |
| `POST` | `/auth/login` | Login (e-mail + senha) |
| `POST` | `/auth/refresh` | Renova os tokens |
| `POST` | `/auth/api-keys` | Gera uma nova chave de API |

### Users

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/users` | Cria usuário |
| `GET` | `/users/me` | Dados do usuário atual |
| `GET` | `/users` | Lista usuários |
| `GET` | `/users/:id` | Busca usuário por ID |
| `PATCH` | `/users/:id` | Atualiza usuário |
| `DELETE` | `/users/:id` | Remove usuário |

### Notifications

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/notifications/send` | Registra e agenda notificação (`202`) |
| `GET` | `/notifications` | Lista com paginação e filtros (`page`, `limit`, `channel`, `startDate`, `endDate`) |
| `GET` | `/notifications/:id` | Consulta o status de uma notificação |

### Webhooks

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/webhooks/subscription` | Cria uma assinatura de webhook |
| `GET` | `/webhooks/deliveries` | Lista as entregas de webhook |

### Exemplo de envio

```bash
curl -X POST http://localhost:3000/notifications/send \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "EMAIL",
    "recipient": "cliente@exemplo.com",
    "title": "Bem-vindo",
    "content": "Sua conta foi criada."
  }'
```

Resposta (`202 Accepted`):

```json
{
  "data": {
    "success": true,
    "message": "Notificação registrada com sucesso e agendada para processamento.",
    "notificationId": "e2f1c9a0-..."
  },
  "statusCode": 202
}
```

### Evento entregue via webhook

```json
{
  "event": "notification.sent",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "data": {
    "notificationId": "e2f1c9a0-...",
    "channel": "EMAIL",
    "recipient": "cliente@exemplo.com",
    "status": "SENT",
    "sentAt": "2026-01-01T12:00:00.000Z"
  }
}
```

Cada entrega é assinada para que o cliente possa verificar a autenticidade do evento.

---

## Modelo de dados

```
User ──< ApiKey
  │
  ├──< Notification
  │
  └──< WebhookSubscription ──< WebhookDelivery

OutboxEvent (standalone)
```

| Modelo | Campos-chave |
|--------|--------------|
| `User` | `id`, `email` (único), `password` |
| `ApiKey` | `key` (único), `userId` |
| `Notification` | `title`, `content`, `channel`, `recipient`, `status` (`QUEUED`/`PROCESSING`/`SENT`/`FAILED`) |
| `WebhookSubscription` | `url`, `userId` |
| `WebhookDelivery` | `status`, `payload`, `attempts`, `lastError` |
| `OutboxEvent` | `aggregateType`, `aggregateId`, `type`, `payload`, `status` (`PENDING`/`DISPATCHED`/`FAILED`), `attempts` |

---

## Testes

**Unitários** (`test/unit/**/*.spec.ts`) — usam mocks (`vi.fn()`) para isolar guards, services, processors e interceptors:

```bash
npm run test        # executa os testes unitários
npm run test:watch  # watch mode
npm run test:cov    # relatório de cobertura
```

**Integração** (`test/integration/**/*.e2e-spec.ts`) — sobem a aplicação real contra **PostgreSQL** e **Redis** efêmeros via **Testcontainers** (não tocam no banco de desenvolvimento). Requer **Docker** em execução:

```bash
npm run test:integration
```

O `global-setup` inicia os containers, roda `prisma migrate deploy` no banco descartável e injeta as variáveis de ambiente; o teardown derruba tudo. Cada arquivo é isolado (containers compartilhados, banco truncado e cron desabilitado para execução determinística).

Cenários cobertos:

- **Auth**: registro, login, refresh, rotas protegidas por JWT e por API key, respostas 401/409.
- **Autorização**: `AdminGuard` (403 para usuário comum, 200 com a API key de sistema), `OwnershipGuard` (403 ao acessar/editar outro usuário), API key inválida (401) e validação de URL do webhook (400).
- **Notificações**: escrita atômica de `Notification` + `OutboxEvent`, paginação, filtro por canal, validação e isolamento entre usuários.
- **Entrega E2E**: fluxo `outbox → fila (BullMQ) → worker → webhook`, com um receptor HTTP local validando a assinatura `X-Hub-Signature-256` (HMAC-SHA256) e o status `SUCCESS` da entrega.
- **Refresh token**: renovação devolvendo access token do mesmo `sub`, rejeição de access-token-como-refresh, token malformado e token expirado (401).
- **Rate limiting**: bloqueio do login (429) após exceder o limite por minuto.
- **Retry de webhook**: entrega que falha (HTTP 500) marcada como `FAILED`, reenvio atualizando a **mesma linha** para `SUCCESS` (sem duplicar registros) e respeito ao teto de **3 tentativas**.
- **Idempotência do outbox**: reexecutar o despacho com o evento forçado a `PENDING` **não** reprocessa (dedup por `jobId = event.id`), sem duplicar notificações, eventos nem entregas.
- **Concorrência do publisher**: duas instâncias despachando o mesmo evento **não** geram entrega duplicada (`jobId`).
- **Falha do outbox**: evento com payload inválido é marcado como `FAILED` sem derrubar a varredura.
- **Retry do job / falha definitiva**: com o provider indisponível, o job é tentado **3 vezes** (backoff exponencial), a notificação vira `FAILED` e dispara o webhook `notification.failed`.
- **Limpeza (maintenance)**: purga de eventos `DISPATCHED` e entregas antigas, preservando os recentes e os `PENDING`.

---

## Estrutura do projeto

```
src/
├── main.ts                     # Bootstrap: pipes, filters, interceptors, CORS
├── app.module.ts               # Módulo raiz + guards globais
├── common/
│   ├── constants/              # Constantes internas
│   ├── decorators/             # @CurrentUser, @Public
│   ├── filters/                # AllExceptionsFilter
│   ├── guards/                 # Jwt, ApiKey, Admin, Ownership, Local
│   ├── interceptors/           # Logging, Transform (envelope de resposta)
│   └── security/               # PasswordHasher
├── config/
│   └── env-validation.ts       # Validação do ambiente
├── modules/
│   ├── auth/                   # Controller, services, strategies
│   ├── users/                  # CRUD de usuários
│   ├── notification/           # Notificações + OutboxPublisherService
│   ├── Queues/                 # Queue constants, processor (worker), sender
│   ├── maintenance/            # Purga de outbox e entregas antigas (@Cron diário)
│   └── webhooks/               # Assinaturas, delivery, signer
├── prisma/
│   ├── schema.prisma           # Modelos
│   ├── prisma.service.ts       # Conexão/desconexão
│   └── migrations/             # Migrações versionadas

test/
├── unit/                       # Testes unitários (Vitest)
└── integration/                # Testes de integração (Vitest + Testcontainers)
    ├── global-setup.ts         # Sobe containers (Postgres/Redis) e aplica migrações
    ├── setup-env.ts            # Injeta variáveis de ambiente do banco efêmero
    └── helpers/                # Bootstrap da app, reset do banco e utilitários HTTP
```

---

## Melhorias futuras

- **Envio real de provedores**: `NotificationSender` é um stub (delay de 1s). Próximo passo é integrar provedores reais por canal.
- **Idempotência no consumo**: adicionar lock/de-duplicação no worker para reentregas.
- **Observabilidade**: expor métricas (tamanho da fila, taxa de falha) e *health checks*.

---

## Licença

UNLICENSED — projeto privado.
