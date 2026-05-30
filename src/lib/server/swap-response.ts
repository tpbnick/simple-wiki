/** HTML body returned while a backup restore is in progress. */
export function databaseSwapInProgressHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Restore in progress</title>
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
      main {
        max-width: 28rem;
        padding: 2rem;
        text-align: center;
      }
      h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
      p { margin: 0; color: #475569; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>Database restore in progress</h1>
      <p>The wiki is temporarily unavailable while a backup is being restored. Refresh in a few seconds.</p>
    </main>
  </body>
</html>`
}

/** Returns true when the request prefers an HTML response over JSON. */
export function prefersHtmlResponse(_request: Request, pathname: string): boolean {
  return !pathname.startsWith('/api')
}
