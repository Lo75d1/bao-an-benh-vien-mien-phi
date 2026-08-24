FROM node:22.18.0-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/nutrition-engine/package.json packages/nutrition-engine/package.json
COPY apps/meal-service/package.json apps/meal-service/package.json
RUN npm ci --no-audit --no-fund --fetch-retries=6 --fetch-retry-mintimeout=15000 --fetch-retry-maxtimeout=120000

FROM base AS builder
COPY packages packages
COPY apps apps
COPY data data
RUN npm run db:generate -w @suat-an/meal-service && npm run build

FROM node:22.18.0-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs && mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
COPY --from=builder --chown=nextjs:nodejs /app/apps/meal-service/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/meal-service/.next/static ./apps/meal-service/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/meal-service/server.js"]

FROM builder AS migrate
CMD ["npm", "run", "db:migrate", "-w", "@suat-an/meal-service"]

FROM builder AS seed
CMD ["npm", "run", "db:seed", "-w", "@suat-an/meal-service"]
