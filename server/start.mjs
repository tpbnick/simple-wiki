/**
 * Production entrypoint for adapter-node.
 *
 * adapter-node defaults request URL protocol to https when ORIGIN and PROTOCOL_HEADER
 * are unset. On plain HTTP (COOKIE_SECURE=false) that breaks SvelteKit CSRF checks and
 * every form POST returns 403. Inject x-forwarded-proto: http for those deployments.
 */
import http from 'node:http'

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
