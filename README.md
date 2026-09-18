<p align="center">
  <h<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/BullMQ-FF1643?style=for-the-badge&logo=bullmq&logoColor=white" alt="BullMQ">
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=white" alt="Swagger">
</p>

<h3 align="center">Notifly: Microsserviço de Notificações Assíncronas & Webhooks</h3>

<p align="center">
  Sistema backend <em>headless</em> projetado para ingestão de eventos de comunicação (e-mail, push, SMS), processamento resiliente via filas, entrega assíncrona e despacho de webhooks de status para clientes integradores.
</p>

---

## 🚀 Sobre o Projeto

O **Notifly** foi arquitetado com foco em alta performance, desacoplamento e segurança rigorosa. A aplicação utiliza o ecossistema do NestJS para garantir uma estrutura modular e escalável, separando responsabilidades entre ingestão de dados, processamento em background (filas) e notificações externas.

---

## 🛠️ Tecnologias e Stack

Abaixo estão as tecnologias e pacotes utilizados no desenvolvimento do microsserviço:

| Categoria | Tecnologia / Pacote | Aplicação no Projeto |
| :--- | :--- | :--- |
| **Configuração** | `@nestjs/config` + `joi` | Leitura e validação estrita de variáveis de ambiente (`.env`) na inicialização. |
| **Segurança & Auth** | `@nestjs/jwt`, `bcrypt` (Custom Guards) | Autenticação mista via **JWT** (painel de controle) e **API Key** (integrações de máquina). |
| **Validação** | `class-validator`, `class-transformer` | Sanitização e validação de payloads nos DTOs via `ValidationPipe` global[cite: 1]. |
| **Banco & ORM** | `TypeORM / Prisma` + `PostgreSQL` | Persistência de usuários, notificações, chaves de API e logs de entrega[cite: 1]. |
| **Filas & Jobs** | `@nestjs/bullmq` + `Redis` | Desacoplamento do envio, retentativas automáticas (`exponential backoff`) e controle de concorrência[cite: 1]. |
| **Documentação** | `@nestjs/swagger` | Documentação interativa da API via OpenAPI/Swagger em `/api/docs`[cite: 1]. |
| **Requisições Externas** | `@nestjs/axios` (`HttpModule`) | Disparo das requisições de saída dos webhooks para os clientes cadastrados[cite: 1]. |
| **Agendamento** | `@nestjs/schedule` | Cron jobs periódicos para expurgo de logs antigos e reprocessamento de webhooks com falha[cite: 1]. |
| **Monitoramento** | `@nestjs/terminus` | Endpoint `/health` para checar a saúde do banco de dados e do Redis[cite: 1]. |
| **Resiliência & Logs** | Filters & Interceptors nativos | `HttpExceptionFilter` customizado e Interceptor de auditoria com máscara de dados sensíveis[cite: 1]. |

---

## 🏗️ Arquitetura Modular

A estrutura de diretórios segue os padrões avançados do NestJS, organizada por domínios e camadas transversais (`common`):

```text
src/
├── common/
│   ├── decorators/      # @CurrentUser, @Public, @Roles, etc.
│   ├── filters/         # HttpExceptionFilter global
│   └── guards/          # JwtAuthGuard, ApiKeyGuard, RolesGuard
├── config/              # Schema de validação das env vars (Joi)
├── modules/
│   ├── auth/            # Login, estratégias e geração de API Keys
│   ├── users/           # Gestão de contas de clientes
│   ├── notifications/   # CRUD, DTOs, controllers e services de disparo
│   ├── queues/          # BullMQ consumers/processors para envio e retentativas
│   ├── webhooks/        # Registro de endpoints e dispatchers com assinatura HMAC
│   └── health/          # Terminus health checks
└── app.module.ts
