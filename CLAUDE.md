# CLAUDE.md — laundromat_system

This file gives Claude Code the context needed to work on this project.

## What this project is

Internal management system for a dry-cleaning and laundry business — Lavanderia Visconde.
Built on top of `nest_next_template` boilerplate.

- **API**: https://laundry-system-api.fly.dev
- **Web**: https://laundromat-system-web.vercel.app
- **GitHub**: jocabaldini/laundromat_system

## How to work with the developer

- **Always discuss and present a plan before writing any code.**
- The developer reviews each backlog item before implementation begins.
- One item at a time — do not move to the next item without explicit confirmation.
- **Never commit or push.** The developer always reviews and commits manually after validation.
- All code comments and commit messages must be in **English**.
- Conventional Commits enforced via Husky: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `ci`, `perf`.

## i18n rules

- **Every user-facing text must go through the i18n system.** No hardcoded strings in components.
- Add all new strings to both `apps/web/lib/i18n/locales/pt-BR.ts` and `apps/web/lib/i18n/locales/en-US.ts`.
- Pass the `dict` prop down to client components that need translated strings.
- **Never pass functions in dict to client components** — compute them server-side into plain strings before passing as props (React Server Components cannot serialize functions across the server/client boundary).
- Never write Portuguese or English text directly in JSX — always reference `dict.key`.

## Tech stack

| Layer | Technology |
|---|---|
| API | NestJS 11, TypeScript, Prisma ORM |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| Database | PostgreSQL / Supabase (São Paulo region) |
| Cache | Redis / Upstash (shared with school_system) |
| Deploy | Fly.io (API) + Vercel (Web) |
| CI/CD | GitHub Actions |

## Roles

| Role | Description |
|---|---|
| `OPERATOR` | Full access — manages customers, service orders, invoices |
| `USER` | Reserved for future use |

## Architecture decisions (do not change without discussion)

- **Refresh token hashing**: SHA-256 via `crypto.createHash` — NOT bcrypt
- **Token uniqueness**: `jti: randomUUID()` on every generated JWT
- **Request context**: `AsyncLocalStorage` propagates `requestId`
- **Logger**: transport pattern — only 5xx errors logged by `HttpExceptionFilter`
- **RBAC**: roles embedded in JWT payload
- **fly.toml** is at the **monorepo root** (not in `apps/api/`)
- **Dockerfile CMD**: `node dist/main`
- **CI deploy**: `flyctl deploy --local-only`
- **Supabase**: `DATABASE_URL` port 6543 with `?pgbouncer=true`; `DIRECT_URL` port 5432
- **DB migrations**: use DROP DEFAULT → TYPE text → DROP TYPE → CREATE TYPE → USING cast → SET DEFAULT (NOT `ALTER TYPE RENAME VALUE` — fails with Supabase pgbouncer)
- **Soft-delete**: all models use `deletedAt DateTime?` — never hard-delete. Queries filter `deletedAt: null` by default, accepting an `includeDeleted` flag to include them.
- **Repository Pattern**: every module has a `*.repository.ts` that owns all Prisma access. Services contain business logic only and depend on the repository interface.
- **All configurable values in environment variables**: URLs, parameters, and settings must never be hardcoded.

## Project structure

```
apps/api/src/
  auth/                       — JWT auth, guards, decorators
  common/
    filters/                  — HttpExceptionFilter (global)
    logger/                   — LoggerService, transport pattern
    repositories/             — base.repository.interface.ts
    request-context/          — AsyncLocalStorage request ID
  config/                     — Joi env validation
  customers/                  — Customer module (CRUD + soft-delete)
    dto/
    customers.controller.ts
    customers.repository.ts
    customers.service.ts
    customers.service.spec.ts
  i18n/                       — translation files (en/, pt/)
  prisma/                     — PrismaService
  users/                      — Users module (CRUD + RBAC)
    dto/
    users.controller.ts
    users.repository.ts
    users.service.ts
    users.service.spec.ts

apps/web/
  app/(auth)/login/
    page.tsx
    view/LoginClient.tsx
  app/(protected)/
    _components/
      AppLayout.tsx           — server component: shell with Navbar + Sidebar + slot
      Navbar.tsx              — top header: logo, locale toggle, theme toggle, user menu
      PageHeader.tsx          — reusable: title + breadcrumbs + action slot
      Sidebar.tsx             — left nav: links to all modules
    customers/
      [id]/edit/page.tsx
      _components/CustomerForm.tsx
      new/page.tsx
      page.tsx
      actions.ts
      view/CustomersClient.tsx
    dashboard/
      page.tsx
      actions.ts
      view/DashboardClient.tsx
    layout.tsx                — renders AppLayout (all protected pages share shell)
  app/_components/
    ThemeProvider.tsx
    Toast.tsx
  app/api/[...path]/          — API proxy route
  app/layout.tsx              — root layout (fonts, ThemeProvider, metadata)
  app/page.tsx                — redirects to /dashboard
  lib/
    api/
      client.ts               — browser-side fetch (proxy route)
      config.ts               — getApiUrl()
      routes.ts               — NEST_ROUTES constants
      server-client.ts        — server-side fetch with auth token injection
    auth/
      actions.ts              — loginAction, logoutAction
      session.ts              — cookie helpers
    i18n/                     — getDictionary, locales, Dictionary type
    types/index.ts            — shared interfaces (User, Customer, ServiceOrder, Invoice)
    env.ts                    — Zod env validation
  proxy.ts                    — route protection + token refresh
```

## Prisma schema (current)

```prisma
enum Role {
  OPERATOR
  USER
}

model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  passwordHash     String
  refreshTokenHash String?
  role             Role      @default(USER)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model Customer {
  id        String    @id @default(cuid())
  code      String    @unique
  name      String
  phone     String?
  email     String?
  address   String?
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([name])
  @@index([deletedAt])
}
```

## API endpoints (current)

```
POST   /auth/login                        — public
POST   /auth/refresh                      — public
POST   /auth/logout                       — Bearer
GET    /auth/me                           — Bearer

POST   /users                             — OPERATOR only
GET    /users                             — OPERATOR only
GET    /users/:id                         — OPERATOR or own
PATCH  /users/:id                         — OPERATOR or own
DELETE /users/:id                         — OPERATOR only

GET    /customers                         — OPERATOR (?search= ?includeDeleted=)
GET    /customers/code/:code              — OPERATOR (exact code lookup)
GET    /customers/code/:code/availability — OPERATOR (real-time availability check)
GET    /customers/suggest-code?name=      — OPERATOR (suggests 3-char code from name)
GET    /customers/:id                     — OPERATOR
POST   /customers                         — OPERATOR
PATCH  /customers/:id                     — OPERATOR
DELETE /customers/:id                     — OPERATOR (soft-delete)

GET    /health                            — public
```

## Design system

**Colors:** CSS variables in `globals.css` — always use `var(--token)`, never hardcoded hex.
**Fonts:** `--font-inter` (UI), `--font-playfair` (display/headings).
**Theme:** `class` strategy on `<html>` — ThemeProvider toggles `dark` class. Supports light/dark/system.
**Key tokens:**
- `--bg-page`, `--bg-card`, `--border-card`
- `--text-heading`, `--text-body`, `--text-secondary`, `--text-muted`
- `--btn-primary-bg`, `--btn-primary-hover`, `--text-on-primary`
- `--color-success/info/warning/danger` + `-bg`, `-text` variants
- `--primary`, `--primary-subtle`, `--border-input`, `--border-input-focus`

## Running locally

```bash
docker compose up -d
npm install
npm run db:migrate
ADMIN_EMAIL=op@example.com ADMIN_PASSWORD=Operator@123 ADMIN_NAME=Operator npm run db:seed
npm run dev
```

## E2E tests

```bash
docker compose up -d
npm run -w apps/api test:e2e
# Expected: 62/62 passing
```

Unit tests:
```bash
npm run -w apps/api test
# Expected: 17/17 passing
```

## Deploy

Push to `main` triggers GitHub Actions:
1. Lint + E2E tests
2. `flyctl deploy --local-only`
3. Vercel deploys automatically

---

## Backlog — Phase 1

### ✅ Item 1 — Infrastructure and Boilerplate Adaptation
- Renamed role `ADMIN` → `OPERATOR`
- Fixed seed.ts to read env vars and update password on upsert
- Updated README

### ✅ Item 2 — Visual Identity
- Lavanderia Visconde design system (CSS variables, Playfair Display + Inter)
- Logo SVG + favicon
- Login, Navbar, Dashboard updated
- ThemeProvider (light/dark/system)

### ✅ Item 2.5 — Structural Patterns
- Repository Pattern on all modules
- serverApi client (server-side, auto-injects token, returns ApiResult<T>)
- Shared types in lib/types/index.ts
- Unit tests for services
- npm audit + Renovate + Dependabot configured

### ✅ Item 3 — Customer Module
- API: CRUD + soft-delete + code availability + suggest-code
- Web: sidebar layout, customer list, create/edit forms, real-time code validation

### 🔲 Item 3.1 — Update Bruno collection with Customer endpoints

### 🔲 Item 4 — Service Order Module (OS) ← NEXT
Sub-items to be defined with the developer before starting.

### 🔲 Item 5 — Invoice Module (Nota Fiscal)
- Internal NF linked to OS, PDF download
- Architecture prepared for external issuer (Phase 2)

### 🔲 Item 6 — Users Module (Frontend)
- CRUD completo no frontend (list, create, edit, delete)
- OPERATOR only

### 🔲 Item 7 — Open Questions (resolve before Items 4–5)
- Is price/kg a global config or per OS?
- PDF library preference?
- Can 3-digit codes be reused when customer becomes inactive?

### 🔲 Item 8 — Dashboard with real data

### 🔲 Item 9 — Update README with full project documentation

---

## Phase 2 (future)

- External NF issuer (NFe/NFSe)
- NF via email and WhatsApp
- Operational dashboard
- Cash flow, exportable reports
- Pricing per garment type
- Price/kg history