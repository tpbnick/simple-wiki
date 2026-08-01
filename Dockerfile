# syntax=docker/dockerfile:1

# ── Build ─────────────────────────────────────────────────
FROM node:25-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ curl ca-certificates unzip \
  && curl -fsSL https://bun.sh/install | bash \
  && ln -sf /root/.bun/bin/bun /usr/local/bin/bun \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --ignore-scripts \
  && echo "Compiling better-sqlite3 for Node…" \
  && npm rebuild better-sqlite3

COPY . .

ARG GIT_COMMIT=unknown
ARG GIT_COMMIT_DATE=
ENV GIT_COMMIT=$GIT_COMMIT
ENV GIT_COMMIT_DATE=$GIT_COMMIT_DATE
RUN bun node_modules/@sveltejs/kit/svelte-kit.js sync && bun run build

# ── Production ────────────────────────────────────────────
FROM node:25-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ gosu \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system wiki \
  && useradd --system --gid wiki -d /app -s /usr/sbin/nologin wiki

COPY --from=builder /app/package.json /app/bun.lock* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY server/start.mjs ./server/start.mjs
COPY scripts/reset-password.mjs ./scripts/reset-password.mjs

RUN npm prune --omit=dev \
  && npm rebuild better-sqlite3 \
  && mkdir -p /data /uploads \
  && chown -R wiki:wiki /app /data /uploads

RUN <<'SH'
cat >/entrypoint.sh <<'EOF'
#!/bin/sh
set -e

mkdir -p /data /uploads

if [ -n "${WIKI_ORIGIN:-}" ] && [ -z "${ORIGIN:-}" ]; then
  export ORIGIN="$WIKI_ORIGIN"
fi

if [ -n "${PUID:-}" ] || [ -n "${PGID:-}" ]; then
  if [ -z "${PUID:-}" ] || [ -z "${PGID:-}" ]; then
    echo "Both PUID and PGID must be set when overriding container user IDs." >&2
    exit 1
  fi

  if [ "$PUID" = "0" ]; then
    exec "$@"
  fi

  if getent group wiki >/dev/null 2>&1; then
    groupmod -o -g "$PGID" wiki
  else
    groupadd -o -g "$PGID" wiki
  fi

  if id wiki >/dev/null 2>&1; then
    usermod -o -u "$PUID" -g wiki wiki
  else
    useradd -o -u "$PUID" -g wiki -d /app -s /usr/sbin/nologin wiki
  fi

  chown -R "$PUID:$PGID" /data /uploads /app
  exec gosu wiki "$@"
fi

chown -R wiki:wiki /data /uploads /app
exec gosu wiki "$@"
EOF
chmod +x /entrypoint.sh
SH

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/wiki.db
ENV UPLOADS_DIR=/uploads
ENV PORT=3000
# adapter-node defaults to 512K; Simple-Wiki sets 512M for backup restore and uploads (override with BODY_SIZE_LIMIT)
ENV BODY_SIZE_LIMIT=512M

EXPOSE 3000
VOLUME ["/data", "/uploads"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server/start.mjs"]
