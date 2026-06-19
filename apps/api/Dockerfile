# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /repo

# Necessário para algumas libs nativas (ex: bcrypt) compilarem
RUN apk add --no-cache libc6-compat

# -------------------------
# deps (instala dependências)
# -------------------------
FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json

# Se a API importar packages internos, copie os manifests também:
# COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

# -------------------------
# build (compila Nest + gera prisma)
# -------------------------
FROM base AS build

COPY --from=deps /repo/node_modules ./node_modules
COPY . .

# Prisma generate (no workspace da API)
RUN npm -w apps/api exec prisma generate

# Build da API
RUN npm -w apps/api run build

# Remove devDependencies do root (mantém apenas produção)
RUN npm prune --omit=dev

# -------------------------
# runner (imagem final)
# -------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat
# Usuário não-root
USER node

# Copia apenas o necessário
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main"]
