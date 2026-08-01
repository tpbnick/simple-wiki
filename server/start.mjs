/**
 * Production entrypoint for adapter-node.
 *
 * adapter-node defaults request URL protocol to https when ORIGIN and PROTOCOL_HEADER
 * are unset. On plain HTTP (COOKIE_SECURE=false) that breaks SvelteKit CSRF checks and
 * every form POST returns 403. Inject x-forwarded-proto: http for those deployments.
 *
 * Also aliases WIKI_ORIGIN → ORIGIN (Docker entrypoint does the same) and defaults
 * BODY_SIZE_LIMIT for backup restore / large uploads outside the Docker image.
 */
import http from 'node:http'

if (!process.env.ORIGIN && process.env.WIKI_ORIGIN) {
  process.env.ORIGIN = process.env.WIKI_ORIGIN
}

if (!process.env.BODY_SIZE_LIMIT) {
  process.env.BODY_SIZE_LIMIT = '512M'
}

const useHttpProtoFix =
  process.env.COOKIE_SECURE === 'false' && !process.env.ORIGIN && !process.env.PROTOCOL_HEADER

if (useHttpProtoFix) {
  process.env.PROTOCOL_HEADER = 'x-forwarded-proto'

  const originalCreateServer = http.createServer.bind(http)
  http.createServer = (...args) => {
    const server = originalCreateServer(...args)
    const originalOn = server.on.bind(server)
    server.on = (event, listener) => {
      if (event === 'request') {
        return originalOn(event, (req, res) => {
          if (!req.headers['x-forwarded-proto']) {
            req.headers['x-forwarded-proto'] = 'http'
          }
          return listener(req, res)
        })
      }
      return originalOn(event, listener)
    }
    return server
  }
}

await import('../build/index.js')
