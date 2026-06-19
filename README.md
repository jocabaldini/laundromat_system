# nest-next-template

A full-stack boilerplate built with **NestJS**, **Next.js**, **Prisma** and **PostgreSQL** — designed to be cloned as the starting point for new projects.

Production deployment targets: **Supabase** (database) · **Fly.io** (API) · **Vercel** (web)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Decisions](#architecture-decisions)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Code Patterns](#code-patterns)
- [CI/CD](#cicd)
- [Deploy Guide](#deploy-guide)
- [Using as a Boilerplate](#using-as-a-boilerplate)

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS 11, TypeScript, Prisma ORM |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| Database | PostgreSQL 16 (local) / Supabase (production) |
| Auth | JWT (access + refresh tokens), Passport |
| Validation | class-validator, Joi (API), Zod (web) |
| i18n | nestjs-i18n (API), custom locale system (web) |
| Rate limiting | @nestjs/throttler + Redis (ioredis) |
| Testing | Jest, Supertest (e2e) |
| CI/CD | GitHub Actions |
| Containers | Docker, Docker Compose |

---

## Project Structure

```
nest_next_template/
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── auth/               # JWT auth, guards, decorators
│   │   │   ├── common/
│   │   │   │   ├── filters/        # Global exception filter
│   │   │   │   ├── logger/         # Structured logger with transport pattern
│   │   │   │   └── request-context/# AsyncLocalStorage request ID propagation
│   │   │   ├── config/             # Joi env validation schema
│   │   │   ├── i18n/               # Translation files (en/, pt/)
│   │   │   ├── prisma/             # PrismaService (lifecycle-managed)
│   │   │   ├── users/              # Users CRUD with RBAC
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/                   # e2e test suites
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── helpers/
│   │   │   ├── setup.ts            # Global test setup (migrate + seed)
│   │   │   └── jest-e2e.json
│   │   ├── Dockerfile
│   │   ├── fly.toml
│   │   └── .env.example
│   └── web/                        # Next.js frontend
│       ├── app/
│       │   ├── (auth)/login/       # Public login route
│       │   ├── (protected)/        # Auth-gated routes
│       │   │   └── dashboard/
│       │   └── api/[...path]/      # API proxy route
│       ├── lib/
│       │   ├── api/                # API client, routes, config
│       │   ├── auth/               # Session management, login/logout actions
│       │   └── i18n/               # Locale system
│       ├── proxy.ts                # Route protection + token refresh middleware
│       └── .env.example
├── bruno/                          # Bruno API collection (local API testing)
├── scripts/
│   └── audit-env.ts                # Cross-checks env vars across code, schema and .env.example
├── .github/
│   └── workflows/
│       └── ci.yml                  # Lint + e2e + deploy pipeline
├── docker-compose.yml
└── package.json                    # npm workspaces root
```

---

## Architecture Decisions

### Refresh Token Rotation with SHA-256 Hashing

Every call to `POST /auth/refresh` issues a new token pair and invalidates the previous refresh token. The token hash is stored in the database rather than the raw token.

**Why SHA-256 instead of bcrypt?** bcrypt truncates input at 72 bytes. JWT tokens issued for the same user share identical first 72 bytes (header + start of base64 payload), causing bcrypt to treat different tokens as equal — breaking rotation detection. SHA-256 has no length limit and is appropriate for high-entropy tokens (JWTs don't need key-stretching). Comparison uses `crypto.timingSafeEqual` to prevent timing attacks.

**Why `jti` (JWT ID)?** Each token includes a `jti: randomUUID()` claim, ensuring tokens issued within the same second are cryptographically distinct.

### Structured Logging with Transport Pattern

`LoggerService` implements NestJS's native `LoggerService` interface and is registered via `app.useLogger()`. This means **all framework-level logs** (bootstrap, guards, interceptors) go through the same structured JSON pipeline.

The transport pattern (Strategy) decouples log destinations from log formatting:

```
LoggerService → [ConsoleTransport, DatadogTransport, LokiTransport, ...]
```

Adding a new destination requires only implementing `ILogTransport` and registering it in `LoggerModule` — no changes to `LoggerService` itself.

### Request Context Propagation via AsyncLocalStorage

Every incoming request is assigned a `requestId` (UUID) by `RequestContextMiddleware`. This ID is stored in Node's `AsyncLocalStorage`, making it automatically available to any code running within that request's async context — services, filters, guards — without passing it explicitly through function arguments.

Every log entry emitted during a request includes the `requestId`, enabling full request tracing across log aggregation tools (Datadog, Grafana Loki, etc).

Clients and proxies may provide `X-Request-ID`; the final ID is always echoed in the response header.

### Global Exception Filter

`HttpExceptionFilter` is the single error boundary for the API. It handles:

- `HttpException` — preserves status code and message (including full validation error arrays)
- `PrismaClientKnownRequestError` — maps constraint violations to appropriate HTTP codes
- `PrismaClientValidationError` — returns 400 for malformed queries
- Everything else — returns 500 and logs the exception with full context

This means controllers and services never need `try/catch` for standard error cases.

### RBAC with JWT Claims

Roles (`ADMIN`, `USER`) are embedded in the JWT payload at login time. The `RolesGuard` reads the role from the already-verified token — no extra database round-trip per request.

### Environment Variable Validation

Both apps fail fast on startup if required variables are missing or invalid:

- **API**: Joi schema in `src/config/env.validation.ts`
- **Web**: Zod schema in `lib/env.ts`

Run `npm run audit:env` to cross-check that all variables used in code are declared in both the validation schema and `.env.example`.

### Proxy-based Route Protection (Next.js)

`proxy.ts` runs on every request (Next.js 16 equivalent of `middleware.ts`) and handles:

- Redirecting `/` to `/dashboard`
- Protecting routes under `/(protected)/`
- Auto-refreshing expired access tokens using the refresh token cookie
- Setting the locale cookie for i18n

This keeps all auth logic in one place, away from individual page components.

### API Proxy Route

All requests from the web to the API go through `app/api/[...path]/route.ts`. This avoids exposing the API URL to the browser and allows the API to enforce `CORS_ORIGIN` to a single trusted origin (the Next.js server).

---

## Local Setup

### Prerequisites

- Node.js 20
- Docker + Docker Compose
- npm 10

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/jocabaldini/nest_next_template
cd nest-next-template

# 2. Install dependencies
npm install

# 3. Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 5. Run database migrations
npm run db:migrate

# 6. Seed the admin user
ADMIN_EMAIL=admin@admin.com ADMIN_PASSWORD=Admin@123 ADMIN_NAME=Admin \
  npm run db:seed

# 7. Start both apps
npm run dev
```

The API will be available at `http://localhost:3001` and the web at `http://localhost:3000`.

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API port | `3001` |
| `DATABASE_URL` | Prisma connection (pooled in prod) | `postgresql://...` |
| `DIRECT_URL` | Prisma migrate connection (direct, no pooler) | `postgresql://...` |
| `JWT_SECRET` | Access token secret (min 32 chars) | — |
| `JWT_EXPIRES_IN` | Access token TTL | `1d` |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `30d` |
| `REDIS_URL` | Redis connection for rate limiting | `redis://localhost:6379` |
| `CORS_ORIGIN` | Allowed origin(s), comma-separated | `http://localhost:3000` |
| `API_LOCALE` | Default locale fallback | `pt` |

> `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME` are **not** in `.env` — they are passed inline to the seed command only.

### Web (`apps/web/.env`)

| Variable | Description | Example |
|---|---|---|
| `API_URL` | Internal URL of the NestJS API | `http://localhost:3001` |
| `ACCESS_TOKEN_MAX_AGE` | Access token cookie TTL in seconds | `86400` |

> Must match `JWT_EXPIRES_IN` on the API side.

### Auditing

```bash
npm run audit:env
```

Verifies that every `process.env.VAR` used in source files is declared in both the validation schema and `.env.example`. Run this after adding any new environment variable.

---

## Database

### Migrations

```bash
# Create a new migration after changing schema.prisma
npm run db:migrate

# Apply pending migrations (used in production/CI)
npm run db:deploy

# Open Prisma Studio
npm run db:studio

# Reset the database (drops all data)
npm run db:reset
```

### Seeding

There is no public registration endpoint. The first admin user is created via seed:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=YourPassword@123 ADMIN_NAME="Your Name" \
  npm run db:seed
```

Subsequent admins can be created by an existing admin via `POST /users` with `"role": "ADMIN"`.

---

## Running the App

```bash
# Both apps (API + Web)
npm run dev

# API only
npm run dev:api

# Web only
npm run dev:web

# Build both
npm run build
```

---

## Testing

### e2e Tests (API)

Requires Docker Compose running (uses `postgres-test` on port 5433 and Redis):

```bash
docker compose up -d
npm run -w apps/api test:e2e
```

The global setup (`test/setup.ts`) runs migrations and seeds two test users automatically:

| Email | Password | Role |
|---|---|---|
| `admin@test.com` | `Admin@123` | ADMIN |
| `user@test.com` | `User@123` | USER |

### Manual API Testing (Bruno)

A [Bruno](https://www.usebruno.com/) collection is included in `bruno/`. Bruno is an offline-first API client — no account or cloud sync required.

1. Open Bruno → **Open Collection** → select the `bruno/` folder
2. Select the **Local** environment (top-right dropdown)
3. Run **Login** first to populate `accessToken` and `refreshToken`
4. Use any other request freely

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login, returns token pair |
| `POST` | `/auth/refresh` | — | Rotate refresh token |
| `POST` | `/auth/logout` | Bearer | Invalidate refresh token |
| `GET` | `/auth/me` | Bearer | Current user profile |

### Users

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/users` | Bearer | ADMIN | Create user |
| `GET` | `/users` | Bearer | ADMIN | List all users |
| `GET` | `/users/:id` | Bearer | ADMIN or own | Get user by ID |
| `PATCH` | `/users/:id` | Bearer | ADMIN or own | Update user |
| `DELETE` | `/users/:id` | Bearer | ADMIN | Delete user |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Returns `{ status: "ok" }` |

---

## Code Patterns

### Adding a New Transport (Logger)

```typescript
// 1. Create the transport
@Injectable()
export class DatadogTransport implements ILogTransport {
  log(entry: LogEntry): void {
    // send to Datadog
  }
}

// 2. Register in LoggerModule
providers: [
  ConsoleTransport,
  DatadogTransport,
  {
    provide: LOG_TRANSPORTS,
    useFactory: (console: ConsoleTransport, datadog: DatadogTransport) => [console, datadog],
    inject: [ConsoleTransport, DatadogTransport],
  },
  LoggerService,
],
```

### Adding a New Module (API)

```bash
# Generate with NestJS CLI
npx nest g module features/products
npx nest g controller features/products
npx nest g service features/products
```

Apply `@Roles(Role.ADMIN)` on routes that require admin access, and inject `LoggerService` (available globally — no import needed) for structured logging.

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add google oauth provider
fix(users): handle duplicate email on update
chore: update dependencies
test(auth): add e2e tests for token rotation
ci: add deploy workflow for fly.io
docs: update README with deploy guide
```

Valid types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `ci`, `perf`

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

```
push → main
  ├── Lint (API + Web + format check)
  ├── E2E Tests (PostgreSQL + Redis via GitHub Actions services)
  └── Deploy API to Fly.io (only if ENABLE_DEPLOY = true)
```

The `deploy-api` job is gated by the repository variable `ENABLE_DEPLOY`. This boilerplate has it unset — derived projects set it to `true` to activate deploy on push.

The web (Vercel) deploys automatically via GitHub integration — no workflow needed.

---

## Deploy Guide

This section documents how to configure production deployment for projects derived from this boilerplate.

### 1. Supabase (Database)

1. Create a project at [supabase.com](https://supabase.com) — select **South America (São Paulo)** region
2. Go to **Project Settings → Database → Connection string**
3. Copy two connection strings:
   - **Transaction mode** (port 6543, pgbouncer) → `DATABASE_URL`
   - **Session mode** (port 5432, direct) → `DIRECT_URL`

### 2. Fly.io (API)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# From the repo root, create the app
flyctl apps create your-app-name --region gru

# Update fly.toml
# Change: app = "your-app-name"

# Set all runtime secrets (never stored in the repo)
flyctl secrets set \
  DATABASE_URL="postgresql://...supabase pooled (port 6543)..." \
  DIRECT_URL="postgresql://...supabase direct (port 5432)..." \
  JWT_SECRET="your-secret-min-32-chars" \
  JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars" \
  REDIS_URL="rediss://...upstash..." \
  CORS_ORIGIN="https://your-app.vercel.app"

# Add deploy token to GitHub
flyctl auth token
# → Add as GitHub secret: FLY_API_TOKEN
```

> Migrations run automatically on every deploy via `release_command` in `fly.toml`.

### 3. Redis (Upstash)

1. Create a free database at [upstash.com](https://upstash.com) — select **São Paulo** region
2. Copy the **REST URL** with TLS (`rediss://...`) → add to Fly.io secrets as `REDIS_URL`

### 4. Vercel (Web)

1. Import the repository at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `apps/web`
3. Add environment variables:
   - `API_URL` → your Fly.io app URL (e.g. `https://your-app-name.fly.dev`)
   - `ACCESS_TOKEN_MAX_AGE` → `86400`

### 5. Activate CI/CD

In the GitHub repository, go to **Settings → Secrets and variables → Actions**:

- **Secrets**: add `FLY_API_TOKEN`
- **Variables**: add `ENABLE_DEPLOY` = `true`

### 6. Seed the First Admin

After the first successful deploy:

```bash
flyctl ssh console -C \
  "ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=YourPassword@123 ADMIN_NAME='Your Name' node -e \"require('./dist/prisma/seed')\""
```

---

## Using as a Boilerplate

```bash
# Clone (without git history)
git clone --depth=1 https://github.com/jocabaldini/nest_next_template my-new-project
cd my-new-project

# Reset git history
rm -rf .git
git init
git add .
git commit -m "chore: init from nest-next-template"

# Push to your new repository
git remote add origin https://github.com/your-username/my-new-project.git
git push -u origin main
```

After cloning, update the following before starting development:

- `package.json` (root) — change `name`, `description`, `author`
- `apps/api/package.json` — change `name`
- `apps/web/package.json` — change `name`
- `apps/api/fly.toml` — change `app` to your Fly.io app name
- Both `.env.example` files → copy to `.env` and fill in values
- GitHub repository variables: set `ENABLE_DEPLOY = true` when ready to deploy