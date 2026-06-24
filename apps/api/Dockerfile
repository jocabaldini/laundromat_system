# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /repo

# Required for native addons (e.g. bcrypt) to compile
RUN apk add --no-cache libc6-compat

# -------------------------
# deps — install dependencies
# -------------------------
FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json

# If the API imports internal packages, copy their manifests too:
# COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

# -------------------------
# build — compile NestJS + generate Prisma client
# -------------------------
FROM base AS build

COPY --from=deps /repo/node_modules ./node_modules
COPY . .

# Generate Prisma client for the API workspace
RUN npm -w apps/api exec prisma generate

# Build the API
RUN npm -w apps/api run build

# Strip devDependencies — keep production deps only
RUN npm prune --omit=dev

# -------------------------
# runner — final production image
# -------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

# Run as non-root user
USER node

# Copy only what is needed to run the app
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main"]