# Wiki

A small personal wiki — Markdown pages, wiki links, search, uploads, revision history, and a family tree extension. Built with SvelteKit and SQLite.

## Getting started

```bash
bun install
bun run dev
```

On first run the app creates a database and an admin account. Log in with **admin / admin** — you'll be asked to change the password right away.

Copy `.env.example` to `.env` if you want to change paths or the port. Everything works out of the box without it.

## Docker

```bash
docker compose up --build
```

Open **http://localhost:3000**. The database and uploads live in Docker volumes so they survive restarts.

The compose file sets `COOKIE_SECURE=false` so login works over plain HTTP on localhost. Put TLS in front (Caddy, nginx, Traefik) and set `COOKIE_SECURE=true` if the wiki is reachable beyond your machine.

Production images use Node (`bun run start` runs the same build locally). Bun is fine for development.

## Reverse proxy

If the wiki runs behind a proxy, set `ADDRESS_HEADER=x-forwarded-for` and `XFF_DEPTH=1` so login rate limits use the real client IP instead of the proxy.

## Private wiki

By default anyone can read pages. To require login for reading, set `PUBLIC_READ=false` in your environment.

## Extensions

Add extensions under `extensions/` as TypeScript. They're compiled into the app at build time — change an extension, run `bun run build`, and restart. The family tree extension is included; see `extensions/family-tree/` for an example.
