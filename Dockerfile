FROM node:22.18.0-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY packages/nutrition-engine/package.json packages/nutrition-engine/package.json
COPY apps/meal-service/package.json apps/meal-service/package.json
RUN npm ci

FROM base AS builder
COPY packages packages
COPY apps apps
COPY data data
RUN npm run db:generate -w @suat-an/meal-service && npm run build

FROM node:22.18.0-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/meal-service/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/meal-service/.next/static ./apps/meal-service/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/meal-service/server.js"]

FROM builder AS migrate
CMD ["npm", "run", "db:migrate", "-w", "@suat-an/meal-service"]

FROM builder AS seed
CMD ["npm", "run", "db:seed", "-w", "@suat-an/meal-service"]
