# @agent-ready/next Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `packages/next` to the monorepo — a Next.js App Router middleware that intercepts requests for agent-readiness files (`/robots.txt`, `/llms.txt`, `/sitemap.xml`, `/.well-known/*`) and serves them dynamically using `@agent-ready/core` generators.

**Architecture:** `agentReadyMiddleware(config)` returns a standard Next.js middleware function. On each request it calls `generateAll()` (sync, sub-ms), finds the matching `GeneratedFile` by path, and returns a `NextResponse` with correct `Content-Type` and cache headers. Unmatched paths call `NextResponse.next()` to pass through. `AGENT_READY_MATCHER` is an exported array for the middleware `config.matcher`.

**Tech Stack:** pnpm workspaces, TypeScript 5.x (strict ESM), tsup (dual ESM+CJS), Vitest, Next.js 15 (devDep + peerDep >=14), `@agent-ready/core` (workspace dep)

---

## File Map

```
packages/next/
├── package.json                    # @agent-ready/next, workspace dep on core, peer next>=14
├── tsconfig.json                   # same pattern as packages/core
├── tsup.config.ts                  # same pattern as packages/core (outExtension .mjs/.cjs)
└── src/
    ├── middleware.ts               # agentReadyMiddleware() + AGENT_READY_MATCHER + getContentType()
    ├── index.ts                    # public exports
    └── __tests__/
        └── middleware.test.ts      # all middleware tests
```

---

### Task 1: packages/next scaffold

**Files:**
- Create: `packages/next/package.json`
- Create: `packages/next/tsconfig.json`
- Create: `packages/next/tsup.config.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p packages/next/src/__tests__
```

- [ ] **Step 2: Create packages/next/package.json**

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
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
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
Save to `packages/next/package.json`.

- [ ] **Step 3: Create packages/next/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```
Save to `packages/next/tsconfig.json`.

- [ ] **Step 4: Create packages/next/tsup.config.ts**

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
Save to `packages/next/tsup.config.ts`.

- [ ] **Step 5: Install dependencies from repo root**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm install
```
Expected: pnpm resolves `@agent-ready/core: workspace:*` and installs `next`, `tsup`, `typescript`, `vitest` in `packages/next/node_modules`. `pnpm-lock.yaml` updated.

- [ ] **Step 6: Commit**

```bash
git add packages/next/package.json packages/next/tsconfig.json packages/next/tsup.config.ts pnpm-lock.yaml
git commit -m "chore: scaffold @agent-ready/next package"
```

---

### Task 2: middleware.ts (TDD)

**Files:**
- Create: `packages/next/src/__tests__/middleware.test.ts`
- Create: `packages/next/src/middleware.ts`
- Create: `packages/next/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/next/src/__tests__/middleware.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { agentReadyMiddleware, AGENT_READY_MATCHER } from '../middleware'
import type { AgentReadyConfig } from '@agent-ready/core'

const config: AgentReadyConfig = {
  site: { name: 'Test Site', description: 'A test site', baseUrl: 'https://example.com' },
  content: { llmsTxt: true, llmsFullTxt: true },
  bots: { aiTrain: false, search: true },
  protocol: {
    mcpServerCard: true,
    agentSkills: true,
    apiCatalog: { apis: [{ title: 'REST API' }] },
  },
}

const middleware = agentReadyMiddleware(config)

function req(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

describe('agentReadyMiddleware', () => {
  describe('/robots.txt', () => {
    it('returns 200', () => {
      expect(middleware(req('/robots.txt')).status).toBe(200)
    })

    it('has Content-Type text/plain', () => {
      expect(middleware(req('/robots.txt')).headers.get('content-type')).toContain('text/plain')
    })

    it('content contains User-agent: *', async () => {
      const text = await middleware(req('/robots.txt')).text()
      expect(text).toContain('User-agent: *')
    })
  })

  describe('/llms.txt', () => {
    it('returns 200', () => {
      expect(middleware(req('/llms.txt')).status).toBe(200)
    })

    it('has Content-Type text/plain', () => {
      expect(middleware(req('/llms.txt')).headers.get('content-type')).toContain('text/plain')
    })

    it('content starts with # Test Site', async () => {
      const text = await middleware(req('/llms.txt')).text()
      expect(text).toMatch(/^# Test Site/)
    })
  })

  describe('/llms-full.txt', () => {
    it('returns 200 when llmsFullTxt: true', () => {
      expect(middleware(req('/llms-full.txt')).status).toBe(200)
    })
  })

  describe('/sitemap.xml', () => {
    it('returns 200', () => {
      expect(middleware(req('/sitemap.xml')).status).toBe(200)
    })

    it('has Content-Type application/xml', () => {
      expect(middleware(req('/sitemap.xml')).headers.get('content-type')).toContain('application/xml')
    })

    it('content contains XML declaration', async () => {
      const text = await middleware(req('/sitemap.xml')).text()
      expect(text).toMatch(/^<\?xml/)
    })
  })

  describe('/.well-known paths', () => {
    it('returns 200 for /.well-known/mcp/server-card.json', () => {
      expect(middleware(req('/.well-known/mcp/server-card.json')).status).toBe(200)
    })

    it('/.well-known/mcp/server-card.json has Content-Type application/json', () => {
      expect(
        middleware(req('/.well-known/mcp/server-card.json')).headers.get('content-type')
      ).toContain('application/json')
    })

    it('returns 200 for /.well-known/agent-skills/index.json', () => {
      expect(middleware(req('/.well-known/agent-skills/index.json')).status).toBe(200)
    })

    it('returns 200 for /.well-known/api-catalog', () => {
      expect(middleware(req('/.well-known/api-catalog')).status).toBe(200)
    })
  })

  describe('cache headers', () => {
    it('includes Cache-Control: public on matched paths', () => {
      const cc = middleware(req('/robots.txt')).headers.get('cache-control')
      expect(cc).toContain('public')
      expect(cc).toContain('max-age=3600')
    })
  })

  describe('unknown paths', () => {
    it('passes through /about — no Content-Type set', () => {
      const res = middleware(req('/about'))
      expect(res.headers.get('content-type')).toBeNull()
    })

    it('passes through /api/foo — no Content-Type set', () => {
      const res = middleware(req('/api/foo'))
      expect(res.headers.get('content-type')).toBeNull()
    })
  })

  describe('disabled generators', () => {
    it('passes through /.well-known/mcp/server-card.json when mcpServerCard not configured', () => {
      const limited = agentReadyMiddleware({
        site: { name: 'X', description: 'X', baseUrl: 'https://example.com' },
      })
      const res = limited(req('/.well-known/mcp/server-card.json'))
      expect(res.headers.get('content-type')).toBeNull()
    })

    it('passes through /llms-full.txt when llmsFullTxt not set', () => {
      const limited = agentReadyMiddleware({
        site: { name: 'X', description: 'X', baseUrl: 'https://example.com' },
      })
      const res = limited(req('/llms-full.txt'))
      expect(res.headers.get('content-type')).toBeNull()
    })
  })

  describe('AGENT_READY_MATCHER', () => {
    it('is an array', () => {
      expect(Array.isArray(AGENT_READY_MATCHER)).toBe(true)
    })

    it('contains /robots.txt', () => {
      expect(AGENT_READY_MATCHER).toContain('/robots.txt')
    })

    it('contains /llms.txt', () => {
      expect(AGENT_READY_MATCHER).toContain('/llms.txt')
    })

    it('contains /sitemap.xml', () => {
      expect(AGENT_READY_MATCHER).toContain('/sitemap.xml')
    })

    it('contains a /.well-known pattern', () => {
      expect(AGENT_READY_MATCHER.some((m) => m.includes('.well-known'))).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/next && pnpm test
```
Expected: FAIL — `Cannot find module '../middleware'`

- [ ] **Step 3: Implement middleware.ts**

Create `packages/next/src/middleware.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { generateAll } from '@agent-ready/core'
import type { AgentReadyConfig } from '@agent-ready/core'

export const AGENT_READY_MATCHER = [
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  '/sitemap.xml',
  '/.well-known/:path*',
]

function getContentType(pathname: string): string {
  if (pathname.endsWith('.txt')) return 'text/plain; charset=utf-8'
  if (pathname.endsWith('.xml')) return 'application/xml; charset=utf-8'
  return 'application/json; charset=utf-8'
}

export function agentReadyMiddleware(config: AgentReadyConfig) {
  return function middleware(request: NextRequest): NextResponse {
    const pathname = request.nextUrl.pathname
    const today = new Date().toISOString().split('T')[0]
    const files = generateAll(config, { date: today })
    const file = files.find((f) => `/${f.path}` === pathname)

    if (!file) return NextResponse.next()

    return new NextResponse(file.content, {
      headers: {
        'Content-Type': getContentType(pathname),
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  }
}
```

- [ ] **Step 4: Create index.ts**

```ts
export { agentReadyMiddleware, AGENT_READY_MATCHER } from './middleware'
```
Save to `packages/next/src/index.ts`.

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/next && pnpm test
```
Expected: all tests PASS. Count: 24 tests.

If you see a TypeScript error about `NextRequest` not having `nextUrl`, check that `next` is listed under `devDependencies` in `packages/next/package.json` and that `pnpm install` was run from the repo root.

If you see a module resolution error for `@agent-ready/core`, run `pnpm install` from the repo root (`/Users/hectormendoza/Developer/agent-ready`) — the workspace symlink must be established.

- [ ] **Step 6: Commit**

```bash
git add packages/next/src/middleware.ts packages/next/src/__tests__/middleware.test.ts packages/next/src/index.ts
git commit -m "feat(next): add agentReadyMiddleware() and AGENT_READY_MATCHER"
```

---

### Task 3: Build verification

**Goal:** Confirm tsup produces valid ESM+CJS+types output for `@agent-ready/next`.

- [ ] **Step 1: Run the build**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/next && pnpm build
```
Expected output (tsup):
```
ESM dist/index.mjs  X.XXkb
CJS dist/index.cjs  X.XXkb
DTS dist/index.d.ts
```
No errors.

If you see esbuild errors about build scripts: run `pnpm approve-builds` from the repo root and approve esbuild, then retry.

- [ ] **Step 2: Verify dist files**

```bash
ls /Users/hectormendoza/Developer/agent-ready/packages/next/dist/
```
Expected: `index.mjs`, `index.mjs.map`, `index.cjs`, `index.cjs.map`, `index.d.ts`, `index.d.cts`

- [ ] **Step 3: Smoke-test ESM import**

```bash
cd /Users/hectormendoza/Developer/agent-ready
node --input-type=module <<'EOF'
import { agentReadyMiddleware, AGENT_READY_MATCHER } from './packages/next/dist/index.mjs'
console.log('Matcher:', AGENT_READY_MATCHER)
console.log('Middleware type:', typeof agentReadyMiddleware)
EOF
```
Expected output:
```
Matcher: [ '/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/.well-known/:path*' ]
Middleware type: function
```

- [ ] **Step 4: Run full monorepo test suite**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm test
```
Expected: all tests pass (69 core + 24 next = 93 tests total), zero failures.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(next): verify build output"
```
