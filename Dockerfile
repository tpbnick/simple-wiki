# ── Build ─────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
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
RUN bun node_modules/@sveltejs/kit/svelte-kit.js sync && bun run build

# ── Production ────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system wiki \
  && useradd --system --gid wiki --home-dir /app wiki

COPY --from=builder /app/package.json /app/bun.lock* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

RUN npm prune --omit=dev \
  && npm rebuild better-sqlite3 \
  && mkdir -p /data /uploads \
  && chown -R wiki:wiki /data /uploads /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/wiki.db
ENV UPLOADS_DIR=/uploads
ENV PORT=3000

USER wiki
EXPOSE 3000
VOLUME ["/data", "/uploads"]

CMD ["node", "build/index.js"]
