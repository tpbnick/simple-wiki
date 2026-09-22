# Contributing

## Scripts

| Command            | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `bun run dev`      | Development server with hot reload                              |
| `bun run build`    | Production build                                                |
| `bun run start`    | Run the production server                                       |
| `bun run check`    | Typecheck (Svelte + TypeScript)                                 |
| `bun run lint`     | Lint JavaScript, TypeScript, and Svelte                         |
| `bun run test`     | Run tests (uses Node/vitest — prefer this over bare `bun test`) |
| `bun run test:e2e` | Browser smoke tests against the production server               |

## User guide

The [user guide](https://tpbnick.github.io/simple-wiki/) is built with [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) and deployed to GitHub Pages on pushes to `main` that touch `docs/`.

Preview locally:

```bash
python3 -m venv .venv-docs && source .venv-docs/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```

Open **http://127.0.0.1:8000**.

## Extensions

Extensions add features to Simple-Wiki without modifying core app code. Each extension lives in `extensions/<name>/` and is **compiled into the app at build time**.

> Extensions run trusted code at startup. Only install extensions you wrote or fully trust.

### How loading works

1. On build, SvelteKit bundles every `extensions/*/index.ts` file into the server.
2. On startup, the app loads each extension, applies any database schema, and registers hooks.
3. Optional styles (`styles/*.css`) are bundled for the browser. Client files (`actions/mount.ts`, `lib/preview-template.ts`, `lib/sanitize.ts`, `components/EditorToolbarPanel.svelte`) are picked up by convention. Preview-template handlers and article mounts only activate for enabled extension ids; sanitize allowlists are compile-time.

After changing an extension, run `bun run build` and restart the server.

The bundled **Example** extension (`extensions/example/`) is included in development only. **Family Tree** (`extensions/family-tree/`) ships in production.

### Extension structure

```
extensions/my-extension/
  index.ts           # Required — extension entry point
  schema.sql         # Optional — tables created on first DB open
  styles/            # Optional — CSS loaded globally
  routes/            # Optional — SvelteKit routes (see family-tree for a full example)
  actions/mount.ts   # Optional — article embed mount (createArticleMount)
  lib/preview-template.ts  # Optional — client editor {{Template}} renderer
  lib/sanitize.ts    # Optional — sanitize allowlist contributions
  components/EditorToolbarPanel.svelte  # Optional — editor toolbar UI
```

### Extension API

Each extension exports a default object matching `WikiExtension`:

```typescript
const extension: WikiExtension = {
  name: 'My Extension',
  version: '1.0.0',
  description: 'What it does',
  manageHref: '/my-extension',       // optional — link from Admin → Extensions
  schema: 'CREATE TABLE IF NOT EXISTS ...',  // optional
  writeGuardPaths: ['/api/my-ext'],  // optional — require login for writes
  templates: ['MyTemplate'],         // optional — {{MyTemplate}} names; disabled shows a notice
  hooks: {
    onSidebarItems(items) { ... },           // add nav links
    onTemplateParse(name, params) { ... },   // custom {{Template}} syntax
    onEditorToolbarItems() { ... },         // editor toolbar buttons
    onEditorLoad(toolIds) { ... },            // data for the editor
    onEditorPreviewBundle() { ... },          // records for client preview
    onPageRender(html, page) { ... },        // transform rendered HTML
    onDatabaseReset() { ... }                 // clear caches after backup restore
  }
}
```

### Examples

- **`extensions/example/`** — minimal starter: sidebar link + `{{Counter}}` template
- **`extensions/family-tree/`** — full extension with database schema, API routes, editor toolbar, `{{FamilyTree}}` embeds, and client-side canvas rendering

View loaded extensions in **Admin → Extensions**.
