# laundromat-system

Internal management system for a dry-cleaning and laundry business — built on top of [nest-next-template](https://github.com/jocabaldini/nest_next_template).

Production: **Supabase** (database) · **Fly.io** (API) · **Vercel** (web)

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS 11, TypeScript, Prisma ORM |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| Database | PostgreSQL 16 (local) / Supabase (production) |
| Auth | JWT (access + refresh tokens), Passport |
| Validation | class-validator, Joi (API), Zod (web) |
| Rate limiting | @nestjs/throttler + Redis (Upstash) |
| Testing | Jest, Supertest (e2e) |
| CI/CD | GitHub Actions |

---

## Roles

| Role | Description |
|---|---|
| `OPERATOR` | Full access — manages customers, service orders and invoices |
| `USER` | Reserved for future use |

The first operator is created via seed command (no public registration).

---

## Local Setup

### Prerequisites

- Node.js 20
- Docker + Docker Compose
- npm 10

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/jocabaldini/laundromat_system.git
cd laundromat_system

# 2. Install dependencies
npm install

# 3. Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 5. Run database migrations
npm run db:migrate

# 6. Seed the operator user
ADMIN_EMAIL=operator@example.com ADMIN_PASSWORD=Operator@123 ADMIN_NAME=Operator \
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

### Web (`apps/web/.env`)

| Variable | Description | Example |
|---|---|---|
| `API_URL` | Internal URL of the NestJS API | `http://localhost:3001` |
| `ACCESS_TOKEN_MAX_AGE` | Access token cookie TTL in seconds | `86400` |

---

## Database

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

```bash
ADMIN_EMAIL=operator@example.com ADMIN_PASSWORD=Operator@123 ADMIN_NAME=Operator \
  npm run db:seed
```

---

## Running the App

```bash
npm run dev        # Both apps (API + Web)
npm run dev:api    # API only
npm run dev:web    # Web only
npm run build      # Build both
```

---

## Testing

```bash
docker compose up -d
npm run -w apps/api test:e2e
```

Test users seeded automatically:

| Email | Password | Role |
|---|---|---|
| `admin@test.com` | `Admin@123` | OPERATOR |
| `user@test.com` | `User@123` | USER |

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
| `POST` | `/users` | Bearer | OPERATOR | Create user |
| `GET` | `/users` | Bearer | OPERATOR | List all users |
| `GET` | `/users/:id` | Bearer | OPERATOR or own | Get user by ID |
| `PATCH` | `/users/:id` | Bearer | OPERATOR or own | Update user |
| `DELETE` | `/users/:id` | Bearer | OPERATOR | Delete user |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status: "ok" }` |

---

## Commit Convention

```
feat(customers): add 3-digit code generation
fix(service-orders): correct total amount calculation
chore: update dependencies
```

Valid types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `ci`, `perf`

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR to `main`:

- **Lint** — API + Web + format check
- **E2E Tests** — PostgreSQL + Redis via GitHub Actions services
- **Deploy API** — `flyctl deploy --local-only` (gated by `ENABLE_DEPLOY = true` repository variable)

Web deploys automatically via Vercel GitHub integration.

---

## Production Deploy

- API: https://laundry-system-api.fly.dev
- Web: https://laundromat-system-web.vercel.app

### Seeding the first operator in production

```bash
flyctl ssh console --app laundry-system-api -C \
"env ADMIN_EMAIL=operator@example.com ADMIN_PASSWORD=Operator@123 ADMIN_NAME=Operator node -e \"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL },
    update: { passwordHash: hash },
    create: { email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME, passwordHash: hash, role: 'OPERATOR' }
  });
  console.log('Operator upserted');
}
main().catch(console.error).finally(() => prisma.\$disconnect());
\""
```