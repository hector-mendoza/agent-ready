# agent-ready/next — Design Spec

**Date:** 2026-06-04
**Status:** Approved
**Scope:** `packages/next` — Next.js App Router middleware plugin

---

## Context

`@agent-ready/next` is the second package in the `agent-ready` monorepo. It wraps `@agent-ready/core` generators into a Next.js middleware that intercepts HTTP requests for agent-readiness files and returns their generated content at runtime — no files on disk, no rewrites, no build steps.

**Depends on:** `@agent-ready/core` (workspace dependency)
**Target:** Next.js >= 14, App Router, Edge-compatible runtime

---

## User Setup

Two files in the user's Next.js project root:

```ts
// agent-ready.config.ts
import { defineConfig } from '@agent-ready/core'

export default defineConfig({
  site: { name: 'My App', description: 'A great app', baseUrl: 'https://myapp.com' },
  bots: { aiTrain: false, aiInput: false, search: true },
  content: { llmsTxt: true },
  protocol: { mcpServerCard: true },
})
```

```ts
// middleware.ts
import { agentReadyMiddleware, AGENT_READY_MATCHER } from '@agent-ready/next'
import agentConfig from './agent-ready.config'

export default agentReadyMiddleware(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
```

If the user already has middleware, they compose manually (out of scope for Phase 1).

---

## Package Structure

```
packages/next/
├── src/
│   ├── middleware.ts    # agentReadyMiddleware() + AGENT_READY_MATCHER + getContentType()
│   └── index.ts        # public exports
├── package.json        # @agent-ready/next
├── tsconfig.json
└── tsup.config.ts
```

### `package.json` shape

```json
{
  "name": "@agent-ready/next",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "dependencies": {
    "@agent-ready/core": "workspace:*"
  },
  "peerDependencies": {
    "next": ">=14.0.0"
  },
  "devDependencies": {
    "next": "^15.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

---

## API

### `agentReadyMiddleware(config: AgentReadyConfig)`

Returns a standard Next.js middleware function:

```ts
export function agentReadyMiddleware(
  config: AgentReadyConfig
): (request: NextRequest) => NextResponse
```

**Behavior:**

1. Extracts `request.nextUrl.pathname`
2. Calls `generateAll(config, { date: today })` — synchronous, sub-millisecond
3. Looks up the generated file matching `/${file.path} === pathname`
4. If found: returns `NextResponse` with correct `Content-Type` and cache headers
5. If not found: returns `NextResponse.next()` — passes through to Next.js routing

The `date` (for `sitemap.xml` `<lastmod>`) is computed at request time as `new Date().toISOString().split('T')[0]`.

### `AGENT_READY_MATCHER`

Exported array for use as the `config.matcher` in `middleware.ts`:

```ts
export const AGENT_READY_MATCHER = [
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  '/sitemap.xml',
  '/.well-known/:path*',
]
```

---

## Internal: `getContentType(pathname: string)`

Internal (not exported) function mapping path to MIME type:

| Pattern | Content-Type |
|---------|-------------|
| ends with `.txt` | `text/plain; charset=utf-8` |
| ends with `.xml` | `application/xml; charset=utf-8` |
| everything else | `application/json; charset=utf-8` |

---

## Response Headers

Every matched response includes:

```
Content-Type: <per getContentType()>
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

1-hour TTL, 24-hour stale-while-revalidate. Appropriate for content that changes only when config changes (which requires a redeploy anyway).

---

## Testing Strategy

**Framework:** Vitest + `next/server` (Next.js as devDependency)

`NextRequest` can be constructed directly in Node environment:

```ts
const req = new NextRequest('http://localhost/robots.txt')
const middleware = agentReadyMiddleware(config)
const res = middleware(req)
```

One test file: `packages/next/src/__tests__/middleware.test.ts`

**Tests cover:**
- Known paths return HTTP 200 with correct Content-Type
- `robots.txt` content contains `User-agent: *`
- `llms.txt` content starts with `# Site Name`
- `sitemap.xml` content contains XML declaration
- Unknown path (`/about`) returns `NextResponse.next()` (status `undefined`)
- `llms-full.txt` returns 200 only when `content.llmsFullTxt: true`
- Disabled generators return 404-equivalent (`NextResponse.next()`) — e.g., `/.well-known/mcp/server-card.json` when `protocol.mcpServerCard` not set

---

## `tsup.config.ts`

Same as `packages/core`:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  dts: true,
  clean: true,
  sourcemap: true,
})
```

---

## Out of Scope (Phase 1)

- Middleware composition helpers (chain with existing middleware)
- `withAgentReady()` next.config wrapper
- Static file generation to `public/`
- Support for Pages Router
- Edge caching / CDN invalidation
- `next export` / static site support
