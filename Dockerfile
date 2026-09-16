# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24-alpine

# ---- build: install everything, test, compile -------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run check && npm run typecheck && npm test && npm run build

# ---- prod-deps: production node_modules only ---------------------------------
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- runtime -----------------------------------------------------------------
FROM ${NODE_IMAGE}
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json fantocci.schema.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health || exit 1
ENTRYPOINT ["node", "dist/cli.js"]
