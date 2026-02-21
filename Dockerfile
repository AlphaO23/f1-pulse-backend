# ---------------------------------------------------------------------------
# F1Pulse — production Dockerfile
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app

# Install build toolchain for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# ---------------------------------------------------------------------------
# Dependencies stage — cached unless package files change
# ---------------------------------------------------------------------------
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# Production image
# ---------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S f1pulse && adduser -S f1pulse -G f1pulse

# Create logs directory
RUN mkdir -p /app/logs && chown -R f1pulse:f1pulse /app/logs

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY knexfile.js ./
COPY src ./src

# Own everything by the app user
RUN chown -R f1pulse:f1pulse /app

USER f1pulse

EXPOSE ${PORT:-3000}

# Health check — lightweight liveness probe, no DB dependency.
# Uses the PORT env var that Railway injects at runtime (defaults to 3000).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "src/index.js"]
