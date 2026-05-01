FROM oven/bun:1.3.13 AS builder
WORKDIR /app

ENV DATABASE_URL=file:./dev.db

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN bun install --frozen-lockfile

COPY . .
RUN bun run --filter @codexdash/web build
RUN bun run --filter @codexdash/api bundle
RUN mkdir -p /tmp/codexdash-app-data /tmp/codexdash-prisma \
  && cp /app/node_modules/.bun/@prisma+client@*/node_modules/.prisma/client/libquery_engine-*.so.node /tmp/codexdash-prisma/libquery_engine.so.node

FROM gcr.io/distroless/cc-debian12:nonroot
WORKDIR /app

ENV PORT=3001 \
    WEB_DIST_DIR=/app/web \
    CODEX_OAUTH_CALLBACK_BIND_HOST=0.0.0.0 \
    PRISMA_QUERY_ENGINE_LIBRARY=/app/prisma/libquery_engine.so.node

COPY --from=builder --chown=65532:65532 /tmp/codexdash-app-data /app/data
COPY --from=builder --chown=65532:65532 /app/apps/api/dist/codexdash /app/codexdash
COPY --from=builder --chown=65532:65532 /tmp/codexdash-prisma/libquery_engine.so.node /app/prisma/libquery_engine.so.node
COPY --from=builder --chown=65532:65532 /app/apps/web/dist /app/web

EXPOSE 3001 1455

ENTRYPOINT ["/app/codexdash"]
