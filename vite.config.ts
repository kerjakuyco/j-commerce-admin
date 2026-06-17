import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: the refresh-token currently lives in localStorage (readable by client
// JS). The recommended hardening next step is to migrate it to an HttpOnly,
// Secure, SameSite=Strict cookie issued by the API, so client JS cannot read
// it and the CSP below can be further tightened (e.g. drop connect-src
// wildcards once the API is same-origin or handled via cookies).
function cspPlugin(apiOrigin: string): Plugin {
  return {
    name: 'inject-csp-meta',
    // Dev HMR relies on an inline react-refresh preamble, so only inject the
    // strict CSP into the production build (dist/index.html has no inline
    // scripts — verified during the audit).
    apply: 'build',
    transformIndexHtml(html) {
      const csp = [
        `default-src 'self'`,
        `script-src 'self'`,
        // recharts injects inline styles for ResponsiveContainer sizing.
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: https:`,
        `connect-src 'self' ${apiOrigin}`,
        `object-src 'none'`,
        `frame-ancestors 'none'`,
      ].join('; ')
      const tag = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
      // Insert right after the charset meta so the policy is in effect before
      // any subsequently-parsed resource tags (script/link) are fetched.
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    ${tag}`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = (env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').trim()
  const apiOrigin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
  return {
    plugins: [react(), cspPlugin(apiOrigin)],
  }
})