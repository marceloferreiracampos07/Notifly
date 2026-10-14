# Notifly

Notification management API built with NestJS, PostgreSQL, Redis, and BullMQ.

## 🚀 Quick Start

```bash
pnpm install
pnpm run start:dev
```

## 📡 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | User login (JWT + refresh) |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/users` | Admin | Create user |
| `GET` | `/users/me` | User | Get current user |
| `GET` | `/users` | Admin | List all users |
| `GET` | `/users/:id` | Owner| Get user by ID |
| `PATCH` | `/users/:id` | Owner| Update user |
| `DELETE` | `/users/:id` | Owner| Delete user |

### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/notifications/send` | User | Send notification |
| `GET` | `/notifications` | User | List with filters |
| `GET` | `/notifications/:id` | User | Get status |

### Webhooks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/webhooks/subscription` | User | Create subscription |
| `GET` | `/webhooks/deliveries` | User | List deliveries |

### Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | App + DB + Redis status |

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | NestJS 12 |
| Language | TypeScript |
| ORM | Prisma 6 + PostgreSQL |
| Queue | Redis + BullMQ |
| Auth | JWT (PassportStrategy), Local Strategy |
| Validation | class-validator, class-transformer, Joi |
| HTTP | Axios, Express |
| Testing | Vitest, Supertest, Testcontainers |
| Container | Docker, Docker Compose |
| Lint | Oxlint |
| Format | Prettier |

## 📦 Scripts

| Script | Description |
|--------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm run start:dev` | Start dev mode (`--watch`) |
| `pnpm run build` | Build production |
| `pnpm run start:prod` | Start production |
| `pnpm run test` | Run all tests |
| `pnpm run test:unit` | Unit tests only |
| `pnpm run test:e2e` | End-to-end tests |
| `pnpm run test:cov` | Coverage report |
| `pnpm run lint` | Lint with Oxlint |
| `pnpm run format` | Format with Prettier |

## 🐳 Docker

```bash
# Start all services (app, postgres, redis)
docker-compose up -d

# Stop services
docker-compose down
```

## 🌐 Environment Variables

Copy `.env` and configure:

```
PORT=3000
NODE_ENV=development

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=notifly
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notifly?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=e6af3bc362f1995f87011ac17955980f8cb12b0212db2332e28a7ca61906ac3c
JWT_EXPIRES_IN=1d

# API Key
API_KEY=1375ab54f674baa8f0fd1430a04d72cc3134df4cd581765d6094bfb092c41bf9
```

## 🧪 Testcontainers (Integration Tests)

The project includes Testcontainers for e2e tests with real PostgreSQL and Redis:

```bash
# Run integration tests
pnpm run test:integration
```

Uses `@testcontainers/postgresql` and `@testcontainers/redis` for ephemeral containers.

## 📁 Project Structure

```
src/
├── main.ts              # Application entry point
├── app.module.ts        # Root module
├── common/              # Guards, Interceptors, Filters, Decorators, Constants
│   ├── guards/          # JwtAuthGuard, ApiKeyGuard, OwnershipGuard, AdminGuard, LocalAuthGuard
│   ├── interceptors/    # LoggingInterceptor, TransformInterceptor
│   ├── filters/         # HttpExceptionFilter
│   ├── decorators/      # CurrentUser, Public
│   └── constants/       # SYSTEM_ADMIN_ID
├── config/              # env-validation.ts (Joi schema)
├── modules/             # Feature modules
│   ├── auth/            # Local + JWT strategies, services, DTOs
│   ├── users/           # CRUD users
│   ├── notification/    # Send, filter, status notifications
│   ├── webhooks/        # Subscriptions, deliveries, retry
│   └── queues/          # BullMQ processor
├── prisma/              # Schema + migrations
└── types/               # TypeScript types
```

## 📦 Dependencies Key

- `@nestjs/common`, `@nestjs/core`
- `@nestjs/config`, `@nestjs/throttler`, `@nestjs/terminus`
- `@prisma/client`, `bullmq`
- `passport`, `passport-jwt`, `passport-local`
- `class-validator`, `class-transformer`, `joi`
- `helmet`, `ioredis`
- `vitest`, `supertest`, `@testcontainers/*`
- `oxlint`, `prettier`

## 📄 License

UNLICENSED