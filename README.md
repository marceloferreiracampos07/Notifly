# Notifly - Notification Management API

**Notifly** is a complete notification management system built with NestJS, designed to handle email, SMS, and push notifications with webhook support, queue processing, and comprehensive API governance.

## 📋 Table of Contents

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Pilha Tecnológica (Stacks)](#pilha-tecnológica-stacks)
- [Pré-requisitos](#pré-requisitos)
- [Como Executar](#como-executar)
- [Testes](#testes)
- [Docker](#docker)
- [Endpoints da API](#endpoints-da-api)
- [Regras de Negócio](#regras-de-negócio)
- [Tratamento de Erros](#tratamento-de-erros)
- [Decisões Técnicas](#decisões-técnicas)
- [Próximos Passos](#próximos-passos)

---

## 🚀 Funcionalidades

| Funcionalidade | Descrição |
| :--- | :--- |
| **Auth** | Registro, login, validação de e-mail e autenticação JWT/local |
| **Users** | CRUD completo de usuários com hash de senha |
| **Notifications** | Envio, filtro e status de notificações (EMAIL, SMS, PUSH) |
| **Webhooks** | Criação de assinaturas, dispatch de eventos e retry de falhas |
| **Queues** | Processamento assíncrono de notificações via BullMQ |
| **API Key** | Geração e validação de chaves de API para acesso privilegiado |
| **Health Checks** | Endpoints de saúde da aplicação e dependências |

---

## 🏗️ Arquitetura

```
src/
├── common/           -> Interceptors, Guards, Filters, Decorators, Constants
├── modules/
│   ├── auth/         -> Estratégias Local/JWT, DTOs, Services
│   ├── users/        -> Service, Controller, DTOs
│   ├── notification/ -> Service, Controller, DTOs, Enums
│   ├── webhooks/     -> Service, Controller, DTOs
│   └── queues/       -> Processor, Service, Constants
└── prisma/           -> Schema e Migrações
```

### Padrões Aplicados

- **Clean Code**: Nomenclatura significativa, funções pequenas e focadas
- **SOLID**: Separação de responsabilidades entre services, controllers, dtos
- **NestJS Patterns**: Guards, Interceptors, Pipes, Decorators, Pipes
- **Repository Pattern**: Prisma ORM para abstração de dados
- **CQRS**: Separação de queries e commands via DTOs

---

## 💻 Pilha Tecnológica (Stacks)

| Categoria | Tecnologia |
| :--- | :--- |
| **Backend** | Node.js 20, NestJS 10 |
| **Banco de Dados** | PostgreSQL com Prisma ORM |
| **Fila/Backend** | Redis com BullMQ |
| **Autenticação** | JWT (PassportStrategy), bcrypt (password-hasher) |
| **HTTP** | Axios, Express (underlying) |
| **Validação** | class-validator, class-transformer, Joi |
| **Testes** | Vitest, Supertest |
| **Container** | Docker, Docker Compose |
| **Infraestrutura** | Terraform, AWS (EC2, RDS, ElastiCache) |

---

## 🛠️ Pré-requisitos

Antes de começar, verifique se tem instalado:

- [Node.js](https://nodejs.org/) >= 20.x
- [pnpm](https://pnpm.io/) ou npm >= 10.x
- [Docker](https://www.docker.com/) e Docker Compose
- [Git](https://git-scm.com/)

### Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

O arquivo `.env` contém:

```
PORT=3000
NODE_ENV=development

# Database
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
DATABASE_URL=...

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=sua-chave-secreta-muito-longa-e-segura
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=sua-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# API Key
API_KEY=sua-chave-api-unica
```

---

## 🚀 Como Executar

### 1. Instalação

```bash
# Instalar dependências
pnpm install

# Ou com npm
npm install
```

### 2. Rodar em Desenvolvimento

```bash
# Modo desenvolvimento
pnpm run start:dev

# Ou com npm
npm run start:dev
```

### 3. Rodar em Produção

```bash
# Build
pnpm run build

# Execução production
pnpm run start:prod
```

---

## 🧪 Testes

### Unitários

```bash
# Rodar todos os testes unitários
pnpm run test:unit

# Ou com npm
npm run test:unit
```

### E2E

```bash
# Rodar testes e2e
pnpm run test:e2e
```

### Cobertura de Código

```bash
# Gerar relatório de cobertura
pnpm run test:cov
```

---

## 🐳 Docker

### Desenvolvimento com Docker Compose

```bash
# Subir todos os serviços (app, postgres, redis)
docker-compose up -d

# Parar os serviços
docker-compose down
```

### Build e Rodar da Aplicação

```bash
# Build da imagem
docker build -t notifly .

# Rodar o container
docker run -p 3000:3000 --env-file .env notifly
```

### Docker Compose (Produção)

```yaml
version: '3.8'
services:
  app:
    image: notifly:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/notifly
      - REDIS_HOST=redis
      - JWT_SECRET=${JWT_SECRET}
      - API_KEY=${API_KEY}
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: notifly
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 🔌 Endpoints da API

### Auth

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Registrar novo usuário |
| `POST` | `/auth/login` | Login e gerar tokens JWT |
| `POST` | `/auth/refresh` | Refresh token |

### Users

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/users` | Criar usuário |
| `GET` | `/users` | Listar todos os usuários |
| `GET` | `/users/:id` | Buscar usuário por ID |
| `PATCH` | `/users/:id` | Atualizar usuário |
| `DELETE` | `/users/:id` | Remover usuário |

### Notifications

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/notifications` | Enviar notificação |
| `GET` | `/notifications` | Listar notificações com filtros |
| `GET` | `/notifications/:id/status` | Status da notificação |
| `PATCH` | `/notifications/:id/status` | Atualizar status |

### Webhooks

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/webhooks/subscription` | Criar assinatura de webhook |
| `GET` | `/webhooks/deliveries` | Listar deliveries de webhook |

### API Key

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api-key/generate` | Gerar nova chave API |

---

## ⚙️ Regras de Negócio

1. **Autenticação Obrigatória**: Rotas públicas identificadas com `@Public()` decorator
2. **Validação de E-mail**: E-mails devem ser únicos na base de dados
3. **Força de Senha**: Mínimo 6 caracteres, contendo letras e números
4. **Rate Limiting**: Throttler com TTL de 60s e limite de 100 requisições
5. **Webhook Retry**: Até 3 tentativas de reenvio com intervalo de 5 minutos
6. **Validação de Canal**: Apenas EMAIL, SMS ou PUSH são aceitos
7. **Permissão de Admin**: Guard `OwnershipGuard` protege recursos admin (`system-admin` ID)

---

## ⚠️ Tratamento de Erros

### Formato de Erro Padrão

```json
{
  "statusCode": 400,
  "message": ["email deve ser um e-mail válido"],
  "error": "Bad Request"
}
```

### Códigos de Status

| Código | Significado |
| :--- | :--- |
| `400` | Bad Request - Dados inválidos |
| `401` | Unauthorized - Sem autenticação |
| `403` | Forbidden - Sem permissão |
| `404` | Not Found - Recurso inexistente |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Erro inesperado |

### Exceções Personalizadas

- `ConflictException`: Conflito de dados (ex: e-mail já existente)
- `NotFoundException`: Recurso não encontrado
- `UnauthorizedException`: Credenciais inválidas
- `ForbiddenException`: Acesso negado

---

## 💡 Decisões Técnicas

1. **NestJS como Framework**: Utilização de recursos nativos (Pipes, Guards, Interceptors, Decorators) para governance code
2. **Prisma ORM**: Tip-safe database access with automatic migrations
3. **BullMQ for Fila**: Performance superior e features avançadas de fila
4. **JWT para Auth**: Stateless authentication ideal for microservices
5. **class-validator/class-transformer**: Validação consistente tanto em incoming como outgoing data
6. **Joi para Schemas de Validação**: Validação de ambiente robusta com `config-validation.ts`
7. **Helmet + CORS**: Segurança HTTP headers and cross-origin resource sharing
8. **Logging Interceptor**: Logs estruturados de requisições e respostas com tempo de resposta

---

## 🛠️ Próximos Passos

### Funcionalidades Planejadas

- [x] Refatoração Webhooks (remover hardcode, nomenclatura consistente)
- [ ] **Testes de Integração com Testcontainers**: PostgreSQL e Redis efêmeros para testes e2e
- [ ] **Terraform with AWS**: Infraestrutura como código para deploy em produção
- [ ] Rate limiting por IP/Usuario
- [ ] Template de notificações HTML
- [ ] Retry exponencial para webhooks
- [ ] Versionamento de API (v1, v2)
- [ ] Documentação automática com Swagger/OpenAPI

### Melhorias de Infraestrutura

- [ ] CI/CD pipeline com GitHub Actions
- [ ] Docker multi-stage builds otimizados
- [ ] Monitoring com Prometheus + Grafana
- [ ] Health checks extensivos
- [ ] Log centralizado com Winston/ELASTIC

### Testes

- [ ] Cobertura de código >= 80%
- [ ] Testes de carga com k6 ou artillery
- [ ] Testes de contrato de API (Pact)
- [ ] Integration tests with Testcontainers

---

## 📦 Deploy na AWS (Terraform)

### Estrutura Proposta

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "notifly-db"
  engine     = "postgres"
  version    = "15"
  instance_class = "db.t3.micro"
  name       = "notifly"
  username   = "admin"
  password   = var.db_password
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  node_type                   = "cache.t2.micro"
  replication_mode            = "single"
  availability_zone           = "us-east-1a"
  automatic_failover_enabled  = false
  transit_encryption_enabled  = true
  auth_token                  = var.redis_password
}

# EC2 Instance para aplicação
resource "aws_instance" "app" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = "t3.micro"
  subnet_ids                  = [aws_subnet.private.id]
  security_groups             = [sg_webhook_sg]
  
  user_data = <<-EOF
              #!/bin/bash
              yum install -y docker
              service docker start
              docker pull marceloferreiracampos07/notifly:latest
              docker run -d -p 3000:3000 \
                -e DATABASE_URL=postgresql://admin:${var.db_password}@${aws_db_instance.postgres.endpoint}:5432/notifly \
                -e REDIS_HOST=${aws_elasticache_replication_group.redis.primary_endpoint_address} \
                -e JWT_SECRET=${var.jwt_secret} \
                -e API_KEY=${var.api_key} \
                notifly:latest
              EOF
}
```

---

## 👨‍💻 Autor

**Marcelo Ferreira** - Backend Developer  
[NestJS Ambassador | Clean Code Enthusiast]

---

**Notifly** ⚡ - Notifications made simple