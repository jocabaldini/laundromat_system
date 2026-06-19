# web

Frontend of the template, built with **Next.js 16**, **React 19**, and **Tailwind CSS 4**.

All communication with the API is handled via an internal proxy at `app/api/[...path]/route.ts`,
which forwards requests to the NestJS backend.

---

## 🚀 Running in Development

```bash
# from the monorepo root
npm run dev:web

# or directly in this workspace
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## ⚙️ Environment Variables

Create the file `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> **`NEXT_PUBLIC_API_URL`** — Base URL of the NestJS API. The internal proxy uses this variable
> to forward all `/api/*` calls to the backend.

---

## 🔀 Internal Proxy

The file `app/api/[...path]/route.ts` acts as a reverse proxy:
all requests made to `/api/*` within Next.js are automatically forwarded
to the NestJS API, preserving the method, headers, and body.

Prefixes reserved for Next.js internal use and **not** forwarded to the backend:

| Prefix | Reason |
|---|---|
| `/api/internal` | Next.js internal use |
| `/api/webhooks` | Local webhook handlers |

---

## 🛣️ API Routes (NestJS)

All routes below are consumed via proxy (`/api/*` → NestJS).
Constants are defined in `lib/api/routes.ts`.

### Auth

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/auth/login` | Authenticate user and retrieve JWT | ❌ |
| `GET` | `/auth/me` | Return authenticated user data | ✅ |

#### `POST /auth/login` — Body

```json
{
  "email": "admin@admin.com",
  "password": "senha123"
}
```

#### `POST /auth/login` — Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Users

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/users` | List all users | ✅ |
| `POST` | `/users` | Create a new user | ✅ |
| `GET` | `/users/:id` | Find user by ID | ✅ |
| `PATCH` | `/users/:id` | Update a user | ✅ |
| `DELETE` | `/users/:id` | Remove a user | ✅ |

---

### Health

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/health` | Check API status | ❌ |

---

## 🌱 Seed — Admin User

The database is populated via seed with an admin user.
Credentials are defined by environment variables at runtime:

```bash
# from the monorepo root
ADMIN_EMAIL=admin@admin.com \
ADMIN_PASSWORD=senha123 \
ADMIN_NAME=Admin \
npm run db:seed
```

> - If the user already exists (same email), the seed is skipped without error.
> - `ADMIN_NAME` is optional — defaults to `"Admin"`.
> - `ADMIN_EMAIL` and `ADMIN_PASSWORD` are **required**.

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode |
| `npm run build` | Generate production build |
| `npm run start` | Start production build |
| `npm run lint` | Run ESLint |
