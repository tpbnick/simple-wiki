import { escapeHtml } from '$lib/html.js'

/** Sentence shown when the UI tries to render a disabled extension. */
export function extensionDisabledMessage(extensionName: string): string {
  return `${extensionName} extension is disabled - enable in admin settings`
}

/** Inline alert for a disabled extension template inside article HTML. */
export function renderExtensionDisabledHtml(extensionName: string): string {
  return `<div class="alert alert-warning my-4 text-sm" role="alert">${escapeHtml(extensionDisabledMessage(extensionName))}</div>`
}

/** Standalone page for a disabled extension's own routes. */
export function extensionDisabledPageHtml(extensionName: string): string {
  const message = escapeHtml(extensionDisabledMessage(extensionName))
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${message}</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8fafc;
        color: #0f172a;
      }
      main { max-width: 32rem; padding: 2rem; text-align: center; }
      h1 { font-size: 1.25rem; margin: 0; line-height: 1.4; }
    </style>
  </head>
  <body>
    <main>
      <h1>${message}</h1>
    </main>
  </body>
</html>`
}
