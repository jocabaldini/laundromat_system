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

## Project structure

```
apps/api/src/
  auth/                   — JWT auth, guards, decorators
  common/filters/         — HttpExceptionFilter
  common/logger/          — LoggerService, transport pattern
  common/request-context/ — AsyncLocalStorage request ID
  config/                 — Joi env validation
  i18n/                   — translation files (en/, pt/)
  prisma/                 — PrismaService
  users/                  — Users CRUD with RBAC

apps/web/
  app/(auth)/login/
    page.tsx
    view/LoginClient.tsx  — login form (client component)
  app/(protected)/
    _components/Navbar.tsx — top header with logout + locale switcher
    dashboard/
      page.tsx            — server component, fetches user
      actions.ts          — getMe, logoutAction
      view/DashboardClient.tsx — dashboard content (client component)
  app/_components/Toast.tsx
  app/api/[...path]/      — API proxy route
  app/layout.tsx          — root layout (fonts, metadata, theme)
  app/page.tsx            — redirects to /dashboard
  lib/auth/               — session, login/logout actions
  proxy.ts                — route protection + token refresh
```

## Visual identity — Lavanderia Visconde

### Brand

**Name**: Lavanderia Visconde
**Logo**: SVG with hanger icon + "LAVANDERIA" (small, spaced) + "VISCONDE" (large, bold) + underline
**Favicon**: Square SVG, navy background, white hanger icon

Logo and favicon files to be placed at:
- `apps/web/public/logo.svg`
- `apps/web/public/favicon.svg`

Logo SVG content:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80" fill="none">
  <g transform="translate(8, 8)">
    <path d="M32 8 C32 4 28 1 24 1 C20 1 17 4 17 8 C17 11 19 13 22 14"
          stroke="#1E2E6E" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M22 14 L4 38 L44 38 Z"
          stroke="#1E2E6E" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
    <path d="M2 38 L46 38"
          stroke="#1E2E6E" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M2 38 L2 41" stroke="#1E2E6E" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M46 38 L46 41" stroke="#1E2E6E" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <g transform="translate(68, 0)">
    <text x="0" y="30" font-family="Georgia, serif" font-size="13" font-weight="400"
          letter-spacing="3" fill="#2D45A8">LAVANDERIA</text>
    <text x="0" y="58" font-family="Georgia, serif" font-size="30" font-weight="700"
          letter-spacing="1" fill="#1E2E6E">VISCONDE</text>
    <line x1="0" y1="65" x2="210" y2="65" stroke="#2D45A8" stroke-width="1.5"/>
  </g>
</svg>
```

Favicon SVG content:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="12" fill="#1E2E6E"/>
  <g transform="translate(9, 8)">
    <path d="M23 6 C23 3 20 1 17 1 C14 1 11 3 11 6 C11 9 13 11 16 12"
          stroke="white" stroke-width="2.8" stroke-linecap="round" fill="none"/>
    <path d="M16 12 L1 38 L45 38 Z"
          stroke="white" stroke-width="2.8" stroke-linejoin="round" fill="none"/>
    <path d="M0 38 L46 38" stroke="white" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M0 38 L0 42" stroke="white" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M46 38 L46 42" stroke="white" stroke-width="2.8" stroke-linecap="round"/>
  </g>
</svg>
```

### Color palette

```js
// tailwind.config.ts
colors: {
  primary: {
    900: '#1E2E6E', // main — texts, titles, icons (light mode)
    700: '#2D45A8', // buttons, links, accents
    500: '#4A6BC4', // hover states, borders
    100: '#E8EDF8', // subtle backgrounds
  },
  neutral: {
    900: '#0F1218', // dark mode background
    50:  '#F8F9FC', // light mode background
  },
  success: '#16A34A',
  info:    '#0284C7',
  warning: '#D97706',
  danger:  '#DC2626',
}
```

### Typography

- **Headings / Logo**: `Playfair Display` (Google Fonts, via `next/font`)
- **UI / Body**: `Inter` (Google Fonts, via `next/font`)

```ts
import { Inter, Playfair_Display } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
```

### Theme

- Support **light**, **dark** and **system** modes
- Use `class` strategy on `<html>` tag (`dark` class)
- Implement a `ThemeProvider` client component that:
  - Reads saved preference from `localStorage` (`theme: 'light' | 'dark' | 'system'`)
  - Applies `dark` class to `<html>` on mount and on change
  - Falls back to `prefers-color-scheme` when `system` is selected
- Add a theme toggle button in `Navbar.tsx` (cycle: light → dark → system)

### CSS variables (globals.css)

```css
:root {
  --background: #F8F9FC;
  --foreground: #1E2E6E;
  --primary: #1E2E6E;
  --primary-hover: #2D45A8;
  --border: #E8EDF8;
  --muted: #4A6BC4;
}
.dark {
  --background: #0F1218;
  --foreground: #F8F9FC;
  --primary: #4A6BC4;
  --primary-hover: #2D45A8;
  --border: #1E2E6E;
  --muted: #2D45A8;
}
```

### Component updates

**layout.tsx**: title "Lavanderia Visconde", fonts, ThemeProvider, favicon.svg

**LoginClient.tsx**: logo above card, primary colors on button and focus rings, themed background

**Navbar.tsx**: primary-900 background (light) / neutral-900 (dark), logo on left, theme toggle button

**DashboardClient.tsx**: `bg-[var(--background)]`, `text-[var(--foreground)]`

---

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
```

## Running locally

```bash
docker compose up -d
npm install
npm run db:migrate
ADMIN_EMAIL=op@example.com ADMIN_PASSWORD=Op@123 ADMIN_NAME=Operator npm run db:seed
npm run dev
```

## E2E tests

```bash
docker compose up -d
npm run -w apps/api test:e2e
# Expected: 37/37 passing
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
- Updated README
- Migration applied in production

### 🔲 Item 2 — Visual Identity ← NEXT
- [ ] Fix `apps/api/tsconfig.json`: add `"prisma/**/*.ts"` to `include`
- [ ] Fix `apps/api/eslint.config.mjs`: add override for `prisma/**/*.ts`
- [ ] Add `apps/web/public/logo.svg`
- [ ] Add `apps/web/public/favicon.svg`
- [ ] Configure `tailwind.config.ts` with color tokens
- [ ] Update `apps/web/app/globals.css` with CSS variables for light/dark
- [ ] Create `apps/web/app/_components/ThemeProvider.tsx`
- [ ] Update `apps/web/app/layout.tsx`
- [ ] Update `apps/web/app/(auth)/login/view/LoginClient.tsx`
- [ ] Update `apps/web/app/(protected)/_components/Navbar.tsx`
- [ ] Update `apps/web/app/(protected)/dashboard/view/DashboardClient.tsx`
- [ ] Commit: `feat(web): apply Lavanderia Visconde visual identity`

### 🔲 Item 2.5 — Discuss project patterns before next feature (discuss with developer first)
Before implementing any feature module (Item 3+), discuss and define:
- API request patterns in the frontend (fetch wrapper, error handling, loading states)
- Form patterns (controlled components, validation, submission feedback)
- Component organization conventions (where to put shared components, naming)
- How to structure new pages (server component + client view pattern already established)

### 🔲 Item 3 — Customer Module
- Model: name, phone, email?, address?, 3-digit unique code
- CRUD + search by code + auto-generation of code
- OPERATOR guard + E2E tests

### 🔲 Item 4 — Service Order Module (OS)
- Model: customer, items, weight, price/kg, discount, status, total
- Status flow: received → washing → ready → delivered
- Discount per OS (fixed or percentage)
- E2E tests

### 🔲 Item 5 — Invoice Module (Nota Fiscal)
- Internal NF linked to OS, PDF download
- Architecture prepared for external issuer (Phase 2)
- E2E tests

### 🔲 Item 6 — Open Questions
- Is price/kg global config or per OS?
- PDF library preference?
- Can 3-digit codes be reused when customer becomes inactive?

### 🔲 Item 7 — Update README

---

## Phase 2 (future)

- External NF issuer (NFe/NFSe)
- NF via email and WhatsApp
- Operational dashboard
- Cash flow, exportable reports
- Pricing per garment type
- Price/kg history