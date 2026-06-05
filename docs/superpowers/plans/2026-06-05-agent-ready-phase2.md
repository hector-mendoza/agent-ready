# agent-ready Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add middleware composition (`withAgentReady`), live URL audit (`--live`), `--force` init flag, index.ts integration tests, and full npm publishing prep (metadata, LICENSE, changesets, READMEs).

**Architecture:** Changes span all three packages plus the monorepo root. Tasks are ordered by dependency: `@agent-ready/next` first (withAgentReady), then `@agent-ready/cli` updates that reference it (init scaffold), then live audit, then index.ts refactor, then publishing prep.

**Tech Stack:** pnpm workspaces, TypeScript 5.x strict ESM, tsup, Vitest, Node.js built-in `fetch` (Node >= 18), `@changesets/cli`

---

## File Map

### `@agent-ready/next`

| File | Change |
|---|---|
| `packages/next/src/middleware.ts` | Add `withAgentReady(config, next?)` function |
| `packages/next/src/index.ts` | Export `withAgentReady` |
| `packages/next/src/__tests__/middleware.test.ts` | Add 4 composition tests |
| `packages/next/package.json` | Add metadata fields + `publishConfig` |

### `@agent-ready/cli`

| File | Change |
|---|---|
| `packages/cli/src/commands/init.ts` | Switch scaffold to `withAgentReady`; add `force` param |
| `packages/cli/src/commands/audit.ts` | Extract + export `printAuditGroups` |
| `packages/cli/src/commands/live-audit.ts` | **Create** — `runLiveAudit`, `printLiveAuditGroups`, types |
| `packages/cli/src/index.ts` | Export `parseFlags`+`main`; add `isMain` guard; update `parseFlags` for booleans; wire `--live` + `--force` + update help |
| `packages/cli/src/__tests__/init.test.ts` | Add 3 `--force` tests; update scaffold content assertions |
| `packages/cli/src/__tests__/live-audit.test.ts` | **Create** — 10+ tests with mocked fetch |
| `packages/cli/src/__tests__/index.test.ts` | **Create** — `parseFlags` unit tests + dispatch integration tests |
| `packages/cli/package.json` | Add metadata fields + `publishConfig` |

### Monorepo root

| File | Change |
|---|---|
| `package.json` | Add `changeset`/`version-packages`/`release` scripts; add `@changesets/cli` devDep |
| `packages/core/package.json` | Add metadata fields + `publishConfig` |
| `LICENSE` | **Create** — MIT license |
| `.changeset/config.json` | **Create** — changesets config |
| `README.md` | **Create** — root monorepo README |
| `packages/core/README.md` | **Create** |
| `packages/next/README.md` | **Create** |
| `packages/cli/README.md` | **Create** |

---

## Task 1: `withAgentReady()` in `@agent-ready/next` (TDD)

**Files:**
- Modify: `packages/next/src/__tests__/middleware.test.ts`
- Modify: `packages/next/src/middleware.ts`
- Modify: `packages/next/src/index.ts`

- [ ] **Step 1: Add failing tests for `withAgentReady`**

Append to `packages/next/src/__tests__/middleware.test.ts` (after the existing `AGENT_READY_MATCHER` describe block):

```ts
import { agentReadyMiddleware, withAgentReady, AGENT_READY_MATCHER } from '../middleware'

// ... existing tests unchanged ...

describe('withAgentReady', () => {
  it('serves matched paths and does NOT call next', () => {
    const nextFn = vi.fn().mockReturnValue(new NextResponse('next content'))
    const mw = withAgentReady(config, nextFn)
    const res = mw(req('/robots.txt'))
    expect(res.headers.get('content-type')).toContain('text/plain')
    expect(nextFn).not.toHaveBeenCalled()
  })

  it('calls next for unmatched paths', () => {
    const nextFn = vi.fn().mockReturnValue(new NextResponse('next content'))
    const mw = withAgentReady(config, nextFn)
    mw(req('/about'))
    expect(nextFn).toHaveBeenCalledWith(expect.objectContaining({ nextUrl: expect.anything() }))
  })

  it('returns NextResponse.next() when no next fn provided and path unmatched', () => {
    const mw = withAgentReady(config)
    const res = mw(req('/about'))
    expect(res.headers.get('content-type')).toBeNull()
  })

  it('works with async next function', async () => {
    const nextFn = vi.fn().mockResolvedValue(new NextResponse('async content'))
    const mw = withAgentReady(config, nextFn)
    const res = await mw(req('/about'))
    expect(nextFn).toHaveBeenCalled()
    expect(await res.text()).toBe('async content')
  })
})
```

Note: add `import { vi } from 'vitest'` at the top of the test file if not already present.

- [ ] **Step 2: Run tests — verify the new tests fail**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/next && pnpm test
```

Expected: 4 new tests FAIL with `withAgentReady is not a function` (or similar). Existing 26 tests still pass.

- [ ] **Step 3: Implement `withAgentReady` in `middleware.ts`**

Add to the end of `packages/next/src/middleware.ts`:

```ts
export function withAgentReady(
  config: AgentReadyConfig,
  next?: (request: NextRequest) => NextResponse | Promise<NextResponse>,
): (request: NextRequest) => NextResponse | Promise<NextResponse> {
  const inner = agentReadyMiddleware(config)
  return function middleware(request: NextRequest): NextResponse | Promise<NextResponse> {
    const res = inner(request)
    if (res.headers.get('content-type') !== null) {
      return res
    }
    return next ? next(request) : NextResponse.next()
  }
}
```

- [ ] **Step 4: Export `withAgentReady` from `index.ts`**

Replace `packages/next/src/index.ts` with:

```ts
export { agentReadyMiddleware, withAgentReady, AGENT_READY_MATCHER } from './middleware'
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/next && pnpm test
```

Expected: 30 tests pass (26 existing + 4 new). Zero failures.

- [ ] **Step 6: Commit**

```bash
git add packages/next/src/middleware.ts packages/next/src/index.ts packages/next/src/__tests__/middleware.test.ts
git commit -m "feat(next): add withAgentReady() middleware composition helper"
```

---

## Task 2: Update `init` scaffold + add `--force` flag (TDD)

**Files:**
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/__tests__/init.test.ts`

- [ ] **Step 1: Add failing tests for `--force` and updated scaffold content**

Add to the end of the `describe('runInit', ...)` block in `packages/cli/src/__tests__/init.test.ts`:

```ts
  it('--force overwrites existing agent-ready.config.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const configPath = join(dir, 'agent-ready.config.ts')
    writeFileSync(configPath, 'existing content', 'utf-8')
    await runInit(dir, true)
    const content = readFileSync(configPath, 'utf-8')
    expect(content).not.toBe('existing content')
    expect(content).toContain('defineConfig')
  })

  it('--force overwrites existing middleware.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const mwPath = join(dir, 'middleware.ts')
    writeFileSync(mwPath, 'existing middleware', 'utf-8')
    await runInit(dir, true)
    const content = readFileSync(mwPath, 'utf-8')
    expect(content).not.toBe('existing middleware')
    expect(content).toContain('withAgentReady')
  })

  it('generated middleware.ts uses withAgentReady', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'middleware.ts'), 'utf-8')
    expect(content).toContain('withAgentReady')
    expect(content).not.toContain('agentReadyMiddleware(agentConfig)')
  })
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```

Expected: 3 new tests FAIL. Existing 7 tests still pass.

- [ ] **Step 3: Update `init.ts` with new scaffold content and `force` param**

Replace `packages/cli/src/commands/init.ts` with:

```ts
import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pass, warn, info } from '../output'

const CONFIG_CONTENT = `import { defineConfig } from '@agent-ready/core'

export default defineConfig({
  site: {
    name: 'My Site',
    description: 'A brief description of what this site does',
    baseUrl: 'https://example.com',
  },
  bots: {
    aiTrain: false,   // disallow AI training crawlers
    aiInput: false,   // disallow AI inference crawlers
    search: true,     // allow search engines
  },
  content: {
    llmsTxt: true,
  },
})
`

const MIDDLEWARE_CONTENT = `import { withAgentReady, AGENT_READY_MATCHER } from '@agent-ready/next'
import agentConfig from './agent-ready.config'

export default withAgentReady(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
`

const MIDDLEWARE_SNIPPET = `  import { withAgentReady, AGENT_READY_MATCHER } from '@agent-ready/next'
  import agentConfig from './agent-ready.config'

  export default withAgentReady(agentConfig)
  export const config = { matcher: AGENT_READY_MATCHER }`

export async function runInit(cwd: string = process.cwd(), force = false): Promise<void> {
  const configPath = join(cwd, 'agent-ready.config.ts')
  const middlewarePath = join(cwd, 'middleware.ts')

  if (!force && existsSync(configPath)) {
    warn('agent-ready.config.ts already exists, skipping')
  } else {
    writeFileSync(configPath, CONFIG_CONTENT, 'utf-8')
    pass('Created agent-ready.config.ts')
  }

  if (!force && existsSync(middlewarePath)) {
    warn('middleware.ts already exists. Add the following to it manually:\n')
    info(MIDDLEWARE_SNIPPET)
  } else {
    writeFileSync(middlewarePath, MIDDLEWARE_CONTENT, 'utf-8')
    pass('Created middleware.ts')
  }

  info('\n✅ Done! Edit agent-ready.config.ts to match your site, then run agent-ready audit.')
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```

Expected: 10 tests pass (7 existing + 3 new). Zero failures.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/__tests__/init.test.ts
git commit -m "feat(cli): add --force flag to init; update scaffold to use withAgentReady"
```

---

## Task 3: `live-audit.ts` (TDD)

**Files:**
- Create: `packages/cli/src/commands/live-audit.ts`
- Create: `packages/cli/src/__tests__/live-audit.test.ts`

- [ ] **Step 1: Write the test file**

Create `packages/cli/src/__tests__/live-audit.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runLiveAudit } from '../commands/live-audit'

const BASE_URL = 'https://example.com'

function makeFetch(responses: Record<string, { status: number; contentType: string; body: string }>) {
  return vi.fn().mockImplementation((url: string) => {
    const path = url.replace(BASE_URL, '')
    const r = responses[path]
    if (!r) return Promise.reject(new Error(`ECONNREFUSED — no mock for ${path}`))
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: { get: (h: string) => (h === 'content-type' ? r.contentType : null) },
      text: () => Promise.resolve(r.body),
    })
  })
}

const happyResponses = {
  '/robots.txt': {
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    body: 'User-agent: *\nContent-Signal: ai-train=false\nContent-Signal: ai-input=false\nContent-Signal: search=true\nSitemap: https://example.com/sitemap.xml',
  },
  '/llms.txt': {
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    body: '# My Site\n\n> A great site',
  },
  '/sitemap.xml': {
    status: 200,
    contentType: 'application/xml; charset=utf-8',
    body: '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com</loc></url></urlset>',
  },
  '/.well-known/mcp/server-card.json': {
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: '{"name":"My Site"}',
  },
}

describe('runLiveAudit', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('all checks pass (happy path)', () => {
    beforeEach(() => {
      globalThis.fetch = makeFetch(happyResponses) as unknown as typeof fetch
    })

    it('returns 10 checks', async () => {
      const result = await runLiveAudit(BASE_URL)
      expect(result.total).toBe(10)
    })

    it('all 10 checks pass', async () => {
      const result = await runLiveAudit(BASE_URL)
      expect(result.passed).toBe(10)
    })

    it('returns passed === total', async () => {
      const result = await runLiveAudit(BASE_URL)
      expect(result.passed).toBe(result.total)
    })
  })

  describe('robots.txt checks', () => {
    it('fails HTTP status check when robots.txt returns 404', async () => {
      globalThis.fetch = makeFetch({
        ...happyResponses,
        '/robots.txt': { status: 404, contentType: 'text/plain', body: '' },
      }) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      const statusCheck = result.checks.find((c) => c.label.includes('robots.txt') && c.label.includes('HTTP 200'))
      expect(statusCheck?.passed).toBe(false)
    })

    it('fails Content-Signal check when body is missing it', async () => {
      globalThis.fetch = makeFetch({
        ...happyResponses,
        '/robots.txt': { status: 200, contentType: 'text/plain', body: 'User-agent: *' },
      }) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      const check = result.checks.find((c) => c.label.includes('Content-Signal'))
      expect(check?.passed).toBe(false)
    })
  })

  describe('network errors', () => {
    it('marks checks as failed when endpoint is unreachable', async () => {
      globalThis.fetch = makeFetch({}) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      expect(result.passed).toBe(0)
      expect(result.total).toBe(10)
    })

    it('does not throw — errors are captured as failed checks', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch
      await expect(runLiveAudit(BASE_URL)).resolves.not.toThrow()
    })
  })

  describe('return shape', () => {
    it('each check has label and passed fields', async () => {
      globalThis.fetch = makeFetch(happyResponses) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      for (const check of result.checks) {
        expect(check).toHaveProperty('label')
        expect(check).toHaveProperty('passed')
        expect(typeof check.label).toBe('string')
        expect(typeof check.passed).toBe('boolean')
      }
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```

Expected: FAIL — `Cannot find module '../commands/live-audit'`.

- [ ] **Step 3: Implement `live-audit.ts`**

Create `packages/cli/src/commands/live-audit.ts`:

```ts
import { pass, fail, info } from '../output'

export interface LiveCheckResult {
  label: string
  passed: boolean
}

export interface LiveAuditResult {
  checks: LiveCheckResult[]
  passed: number
  total: number
}

function liveCheck(label: string, condition: boolean): LiveCheckResult {
  return { label, passed: condition }
}

interface FetchedEndpoint {
  status: number
  contentType: string
  body: string
  error?: string
}

async function fetchEndpoint(url: string): Promise<FetchedEndpoint> {
  try {
    const res = await fetch(url)
    const body = await res.text()
    return {
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      body,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: 0, contentType: '', body: '', error: message }
  }
}

export async function runLiveAudit(baseUrl: string): Promise<LiveAuditResult> {
  const url = baseUrl.replace(/\/$/, '')

  const [robots, llms, sitemap, mcpCard] = await Promise.all([
    fetchEndpoint(`${url}/robots.txt`),
    fetchEndpoint(`${url}/llms.txt`),
    fetchEndpoint(`${url}/sitemap.xml`),
    fetchEndpoint(`${url}/.well-known/mcp/server-card.json`),
  ])

  const statusLabel = (path: string, endpoint: FetchedEndpoint) =>
    endpoint.error
      ? `${path} — Returns HTTP 200 (${endpoint.error})`
      : `${path} — Returns HTTP 200`

  const checks: LiveCheckResult[] = [
    // /robots.txt — 3 checks
    liveCheck(statusLabel('/robots.txt', robots), robots.status === 200),
    liveCheck('/robots.txt — Content-Type: text/plain', robots.contentType.includes('text/plain')),
    liveCheck('/robots.txt — Content-Signal directive present', robots.body.includes('Content-Signal:')),

    // /llms.txt — 2 checks
    liveCheck(statusLabel('/llms.txt', llms), llms.status === 200),
    liveCheck('/llms.txt — Starts with # heading', /^# .+/m.test(llms.body)),

    // /sitemap.xml — 3 checks
    liveCheck(statusLabel('/sitemap.xml', sitemap), sitemap.status === 200),
    liveCheck('/sitemap.xml — Content-Type: application/xml', sitemap.contentType.includes('application/xml')),
    liveCheck('/sitemap.xml — Has <urlset> element', sitemap.body.includes('<urlset')),

    // /.well-known/mcp/server-card.json — 2 checks
    liveCheck(statusLabel('/.well-known/mcp/server-card.json', mcpCard), mcpCard.status === 200),
    liveCheck('/.well-known/mcp/server-card.json — Content-Type: application/json', mcpCard.contentType.includes('application/json')),
  ]

  const passed = checks.filter((c) => c.passed).length
  return { checks, passed, total: checks.length }
}

export function printLiveAuditGroups(result: LiveAuditResult): void {
  const groups = [
    { name: '/robots.txt', checks: result.checks.slice(0, 3) },
    { name: '/llms.txt', checks: result.checks.slice(3, 5) },
    { name: '/sitemap.xml', checks: result.checks.slice(5, 8) },
    { name: '/.well-known/mcp/server-card.json', checks: result.checks.slice(8, 10) },
  ]

  for (const group of groups) {
    info(group.name)
    for (const c of group.checks) {
      const label = c.label.split(' — ').slice(1).join(' — ') || c.label
      if (c.passed) pass(label)
      else fail(label)
    }
    info('')
  }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```

Expected: all tests pass (10 existing + 12 new live-audit tests = 22 tests). Zero failures.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/live-audit.ts packages/cli/src/__tests__/live-audit.test.ts
git commit -m "feat(cli): add live-audit command with 10 HTTP checks"
```

---

## Task 4: Refactor `index.ts` + wire `--live` and `--force` + extract `printAuditGroups`

**Files:**
- Modify: `packages/cli/src/commands/audit.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Extract `printAuditGroups` from `audit.ts`**

Replace `packages/cli/src/commands/audit.ts` (the `printAuditResult` function only — everything above stays the same):

```ts
import { generateRobots, generateLlmsTxt, generateSitemap } from '@agent-ready/core'
import type { AgentReadyConfig } from '@agent-ready/core'
import { pass, fail, info } from '../output'

export interface CheckResult {
  label: string
  passed: boolean
}

export interface AuditResult {
  checks: CheckResult[]
  passed: number
  total: number
}

function check(label: string, condition: boolean): CheckResult {
  return { label, passed: condition }
}

export async function runAudit(flags: {
  url: string
  name?: string
  description?: string
}): Promise<AuditResult> {
  const config: AgentReadyConfig = {
    site: {
      name: flags.name ?? 'My Site',
      description: flags.description ?? 'A site',
      baseUrl: flags.url,
    },
    bots: { aiTrain: false, aiInput: false, search: true },
    content: { llmsTxt: true },
  }

  const robotsContent = generateRobots(config)[0]?.content ?? ''
  const llmsContent = generateLlmsTxt(config).find((f) => f.path === 'llms.txt')?.content ?? ''
  const sitemapContent = generateSitemap(config, { date: '2026-01-01' })[0]?.content ?? ''

  const checks: CheckResult[] = [
    check('robots.txt — Sitemap pointer present', robotsContent.includes('Sitemap:')),
    check('robots.txt — Content-Signal: ai-train directive present', robotsContent.includes('Content-Signal: ai-train=')),
    check('robots.txt — Content-Signal: ai-input directive present', robotsContent.includes('Content-Signal: ai-input=')),
    check('robots.txt — Content-Signal: search directive present', robotsContent.includes('Content-Signal: search=')),
    check('robots.txt — General User-agent: * block present', robotsContent.includes('User-agent: *')),
    check('llms.txt — Starts with # heading', /^# .+/m.test(llmsContent)),
    check('llms.txt — Has > blockquote description', llmsContent.includes('> ')),
    check('sitemap.xml — Valid XML declaration', /^<\?xml/.test(sitemapContent)),
    check('sitemap.xml — Has <urlset> namespace', sitemapContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')),
    check('sitemap.xml — Has <loc> entry', sitemapContent.includes('<loc>')),
  ]

  const passed = checks.filter((c) => c.passed).length
  return { checks, passed, total: checks.length }
}

export function printAuditGroups(result: AuditResult): void {
  const groups = [
    { name: 'robots.txt', checks: result.checks.slice(0, 5) },
    { name: 'llms.txt', checks: result.checks.slice(5, 7) },
    { name: 'sitemap.xml', checks: result.checks.slice(7, 10) },
  ]

  for (const group of groups) {
    info(group.name)
    for (const c of group.checks) {
      const label = c.label.split(' — ')[1] ?? c.label
      if (c.passed) pass(label)
      else fail(label)
    }
    info('')
  }
}

export function printAuditResult(url: string, result: AuditResult): void {
  info(`\nagent-ready audit — ${url}\n`)
  printAuditGroups(result)
  const allPassed = result.passed === result.total
  info(`Score: ${result.passed}/${result.total} checks passed ${allPassed ? '✅' : '❌'}`)
}
```

- [ ] **Step 2: Run existing tests — verify still passing**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```

Expected: 22 tests pass. Zero failures.

- [ ] **Step 3: Replace `index.ts` with the updated version**

Replace `packages/cli/src/index.ts` with:

```ts
import { fileURLToPath } from 'node:url'
import { runInit } from './commands/init.js'
import { runAudit, printAuditResult, printAuditGroups } from './commands/audit.js'
import { runLiveAudit, printLiveAuditGroups } from './commands/live-audit.js'
import { info } from './output.js'

export function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = args[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next
      i++
    } else {
      flags[key] = true
    }
  }
  return flags
}

function printHelp(): void {
  console.log(
    [
      'agent-ready — AI Agent Readiness CLI',
      '',
      'Commands:',
      '  init                              Scaffold agent-ready.config.ts and middleware.ts',
      '       [--force]                    Overwrite existing files',
      '  audit --url <url>                 Validate generated agent-readiness files locally',
      '        [--name <name>]             Site name (default: "My Site")',
      '        [--description <desc>]      Site description (default: "A site")',
      '        [--live]                    Also fetch and check real endpoints',
      '',
      'Options:',
      '  --help, -h                        Show this help message',
      '  --version, -v                     Show version number',
      '',
      'Examples:',
      '  agent-ready init',
      '  agent-ready init --force',
      '  agent-ready audit --url https://example.com',
      '  agent-ready audit --url https://example.com --live',
      '  agent-ready audit --url https://example.com --name "My App" --description "A great app"',
    ].join('\n'),
  )
}

function printVersion(): void {
  console.log('0.1.0')
}

export async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2)

  switch (command) {
    case 'init': {
      const flags = parseFlags(rest)
      await runInit(process.cwd(), flags['force'] === true)
      break
    }

    case 'audit': {
      const flags = parseFlags(rest)
      const url = flags['url']
      if (!url || typeof url !== 'string') {
        console.error('Error: --url is required for audit')
        console.error('Usage: agent-ready audit --url <url>')
        process.exit(1)
      }
      const isLive = flags['live'] === true
      const localResult = await runAudit(
        flags as { url: string; name?: string; description?: string },
      )

      if (isLive) {
        info(`\nagent-ready audit — ${url}\n`)
        info('── Local format checks ──────────────────────────')
        printAuditGroups(localResult)
        info('── Live checks ──────────────────────────────────')
        const liveResult = await runLiveAudit(url)
        printLiveAuditGroups(liveResult)
        const totalPassed = localResult.passed + liveResult.passed
        const totalChecks = localResult.total + liveResult.total
        const allPassed = totalPassed === totalChecks
        info(`Score: ${totalPassed}/${totalChecks} checks passed ${allPassed ? '✅' : '❌'}`)
        if (!allPassed) process.exit(1)
      } else {
        printAuditResult(url, localResult)
        if (localResult.passed < localResult.total) process.exit(1)
      }
      break
    }

    case '--help':
    case '-h':
    case 'help':
      printHelp()
      break

    case '--version':
    case '-v':
      printVersion()
      break

    default:
      printHelp()
      process.exit(command ? 1 : 0)
  }
}

// Only auto-run when executed as the CLI entry point (not imported in tests)
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Run all CLI tests — verify still passing**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```

Expected: 22 tests pass. Zero failures.

- [ ] **Step 5: Rebuild and smoke-test the binary**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm build
node dist/index.mjs --help
node dist/index.mjs audit --url https://example.com
```

Expected: `--help` shows updated text including `--live` and `--force`. `audit` runs 10/10 local checks and exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/audit.ts packages/cli/src/index.ts
git commit -m "feat(cli): add --live flag for live URL checks; add --force to init; export parseFlags+main"
```

---

## Task 5: `index.ts` integration tests

**Files:**
- Create: `packages/cli/src/__tests__/index.test.ts`

- [ ] **Step 1: Create the test file**

Create `packages/cli/src/__tests__/index.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseFlags } from '../index'

// ─── parseFlags unit tests ────────────────────────────────────────────────────

describe('parseFlags', () => {
  it('parses a single string flag', () => {
    expect(parseFlags(['--url', 'https://example.com'])).toEqual({ url: 'https://example.com' })
  })

  it('parses multiple string flags', () => {
    expect(
      parseFlags(['--url', 'https://example.com', '--name', 'My App', '--description', 'A site']),
    ).toEqual({ url: 'https://example.com', name: 'My App', description: 'A site' })
  })

  it('parses a boolean flag (no value)', () => {
    expect(parseFlags(['--force'])).toEqual({ force: true })
  })

  it('parses mixed string and boolean flags', () => {
    expect(parseFlags(['--url', 'https://x.com', '--live'])).toEqual({
      url: 'https://x.com',
      live: true,
    })
  })

  it('skips args that do not start with --', () => {
    expect(parseFlags(['audit', '--force'])).toEqual({ force: true })
  })

  it('returns empty object for empty args', () => {
    expect(parseFlags([])).toEqual({})
  })

  it('treats trailing flag with no value as boolean true', () => {
    expect(parseFlags(['--url', 'https://x.com', '--live'])).toMatchObject({ live: true })
  })

  it('next arg starting with -- is treated as another flag, not a value', () => {
    expect(parseFlags(['--live', '--url', 'https://x.com'])).toEqual({
      live: true,
      url: 'https://x.com',
    })
  })
})

// ─── main() dispatch integration tests ───────────────────────────────────────

vi.mock('../commands/init', () => ({
  runInit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../commands/audit', () => ({
  runAudit: vi.fn().mockResolvedValue({ checks: [], passed: 3, total: 3 }),
  printAuditResult: vi.fn(),
  printAuditGroups: vi.fn(),
}))

vi.mock('../commands/live-audit', () => ({
  runLiveAudit: vi.fn().mockResolvedValue({ checks: [], passed: 3, total: 3 }),
  printLiveAuditGroups: vi.fn(),
}))

describe('main() dispatch', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>
  let originalArgv: string[]

  beforeEach(async () => {
    originalArgv = process.argv
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code ?? 0})`)
    })
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.clearAllMocks()
    exitSpy.mockRestore()
  })

  it('calls runInit for "init" command', async () => {
    process.argv = ['node', 'index.mjs', 'init']
    const { main } = await import('../index')
    const { runInit } = await import('../commands/init')
    await main()
    expect(runInit).toHaveBeenCalled()
  })

  it('passes force=true to runInit when --force is set', async () => {
    process.argv = ['node', 'index.mjs', 'init', '--force']
    const { main } = await import('../index')
    const { runInit } = await import('../commands/init')
    await main()
    expect(runInit).toHaveBeenCalledWith(expect.any(String), true)
  })

  it('calls runAudit for "audit" command with --url', async () => {
    process.argv = ['node', 'index.mjs', 'audit', '--url', 'https://example.com']
    const { main } = await import('../index')
    const { runAudit } = await import('../commands/audit')
    await main()
    expect(runAudit).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com' }))
  })

  it('exits 1 when audit is called without --url', async () => {
    process.argv = ['node', 'index.mjs', 'audit']
    const { main } = await import('../index')
    await expect(main()).rejects.toThrow('process.exit(1)')
  })

  it('prints version for --version', async () => {
    process.argv = ['node', 'index.mjs', '--version']
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { main } = await import('../index')
    await main()
    expect(logSpy).toHaveBeenCalledWith('0.1.0')
    logSpy.mockRestore()
  })

  it('prints version for -v', async () => {
    process.argv = ['node', 'index.mjs', '-v']
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { main } = await import('../index')
    await main()
    expect(logSpy).toHaveBeenCalledWith('0.1.0')
    logSpy.mockRestore()
  })

  it('prints help for --help', async () => {
    process.argv = ['node', 'index.mjs', '--help']
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { main } = await import('../index')
    await main()
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('agent-ready'))
    logSpy.mockRestore()
  })

  it('exits 1 for unknown command', async () => {
    process.argv = ['node', 'index.mjs', 'unknown-command']
    const { main } = await import('../index')
    await expect(main()).rejects.toThrow('process.exit(1)')
  })

  it('exits 0 for no command (bare invocation)', async () => {
    process.argv = ['node', 'index.mjs']
    const { main } = await import('../index')
    await expect(main()).rejects.toThrow('process.exit(0)')
  })
})
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```

Expected: all tests pass (22 existing + ~17 new = ~39 tests). Zero failures.

Note: if Vitest complains about module caching with the dynamic `import('../index')` inside tests, add `vi.resetModules()` to the `beforeEach`:

```ts
beforeEach(async () => {
  vi.resetModules()
  originalArgv = process.argv
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    throw new Error(`process.exit(${code ?? 0})`)
  })
})
```

- [ ] **Step 3: Run full monorepo suite**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm test
```

Expected: all packages pass. Core 69, next 30, cli ~39. Zero failures.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/__tests__/index.test.ts
git commit -m "test(cli): add index.ts integration tests for parseFlags and command dispatch"
```

---

## Task 6: npm Package Metadata + LICENSE + Changesets

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/next/package.json`
- Modify: `packages/cli/package.json`
- Modify: `package.json` (root)
- Create: `LICENSE`
- Create: `.changeset/config.json`

- [ ] **Step 1: Create the MIT license file**

Create `/Users/hectormendoza/Developer/agent-ready/LICENSE`:

```
MIT License

Copyright (c) 2026 Hector Mendoza

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Update `packages/core/package.json`**

Add these fields to the existing `package.json` (alongside the existing fields):

```json
{
  "license": "MIT",
  "author": "Hector Mendoza <hec1702@gmail.com>",
  "keywords": ["agent-ready", "ai", "llms", "robots.txt", "llms.txt", "isitagentready", "generator", "sitemap", "mcp"],
  "repository": {
    "type": "git",
    "url": "https://github.com/hec1702/agent-ready"
  },
  "homepage": "https://github.com/hec1702/agent-ready#readme",
  "bugs": {
    "url": "https://github.com/hec1702/agent-ready/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 3: Update `packages/next/package.json`**

Add the same fields with package-specific keywords:

```json
{
  "license": "MIT",
  "author": "Hector Mendoza <hec1702@gmail.com>",
  "keywords": ["agent-ready", "ai", "llms", "robots.txt", "isitagentready", "nextjs", "middleware", "app-router"],
  "repository": {
    "type": "git",
    "url": "https://github.com/hec1702/agent-ready"
  },
  "homepage": "https://github.com/hec1702/agent-ready#readme",
  "bugs": {
    "url": "https://github.com/hec1702/agent-ready/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 4: Update `packages/cli/package.json`**

```json
{
  "license": "MIT",
  "author": "Hector Mendoza <hec1702@gmail.com>",
  "keywords": ["agent-ready", "ai", "llms", "robots.txt", "isitagentready", "cli", "audit", "scaffold"],
  "repository": {
    "type": "git",
    "url": "https://github.com/hec1702/agent-ready"
  },
  "homepage": "https://github.com/hec1702/agent-ready#readme",
  "bugs": {
    "url": "https://github.com/hec1702/agent-ready/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 5: Install `@changesets/cli` and update root `package.json`**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm add -D -w @changesets/cli
```

Then add these scripts to the root `package.json`:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm -r build && changeset publish"
  }
}
```

- [ ] **Step 6: Create `.changeset/config.json`**

Create `/Users/hectormendoza/Developer/agent-ready/.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 7: Verify changesets is wired correctly**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm changeset --help
```

Expected: changeset CLI help output. No errors.

- [ ] **Step 8: Commit**

```bash
git add packages/core/package.json packages/next/package.json packages/cli/package.json package.json LICENSE .changeset/config.json pnpm-lock.yaml
git commit -m "chore: add npm publishing metadata, MIT license, and changesets setup"
```

---

## Task 7: READMEs

**Files:**
- Create: `README.md` (root)
- Create: `packages/core/README.md`
- Create: `packages/next/README.md`
- Create: `packages/cli/README.md`

- [ ] **Step 1: Create root `README.md`**

Create `/Users/hectormendoza/Developer/agent-ready/README.md`:

```markdown
# agent-ready

Make your Next.js app pass [isitagentready.com](https://isitagentready.com) checks — automatically.

`agent-ready` generates and serves all the files AI agents and crawlers look for: `robots.txt` with Content-Signal directives, `llms.txt`, `sitemap.xml`, `/.well-known/mcp/server-card.json`, `/.well-known/agent-skills/index.json`, and `/.well-known/api-catalog`.

## Packages

| Package | Description |
|---|---|
| [`@agent-ready/core`](packages/core) | Pure generator functions — config → files |
| [`@agent-ready/next`](packages/next) | Next.js App Router middleware |
| [`@agent-ready/cli`](packages/cli) | `agent-ready init` and `agent-ready audit` CLI |

## Quick Start (Next.js)

```bash
npx @agent-ready/cli init
```

Then edit `agent-ready.config.ts` and you're done. Your site will serve all agent-readiness files dynamically — no static files, no build step.

## Local Development

```bash
pnpm install
pnpm build      # build all packages
pnpm test       # run all tests
```

## Publishing

```bash
pnpm changeset          # describe what changed
pnpm version-packages   # bump versions
pnpm release            # build + publish to npm
```

## License

MIT
```

- [ ] **Step 2: Create `packages/core/README.md`**

Create `/Users/hectormendoza/Developer/agent-ready/packages/core/README.md`:

```markdown
# @agent-ready/core

Pure generator functions that turn an `AgentReadyConfig` into agent-readiness files. Zero runtime dependencies. No I/O — all generators return `GeneratedFile[]`.

## Install

```bash
npm install @agent-ready/core
```

## Config

```ts
import { defineConfig } from '@agent-ready/core'

export default defineConfig({
  site: {
    name: 'My Site',
    description: 'A brief description',
    baseUrl: 'https://example.com',
  },
  bots: {
    aiTrain: false,   // disallow AI training crawlers (GPTBot, CCBot, Google-Extended…)
    aiInput: false,   // disallow AI inference crawlers (ClaudeBot, anthropic-ai…)
    search: true,     // allow search engines
  },
  content: {
    llmsTxt: true,
    llmsFullTxt: false,
  },
  protocol: {
    mcpServerCard: true,
    agentSkills: true,
    apiCatalog: {
      apis: [{ title: 'REST API', specUrl: 'https://example.com/openapi.json' }],
    },
  },
})
```

## Generated Files

| Path | Description |
|---|---|
| `robots.txt` | User-agent rules + Content-Signal directives for isitagentready.com |
| `llms.txt` | LLM context file (llmstxt.org spec) |
| `llms-full.txt` | Extended LLM context (when `llmsFullTxt: true`) |
| `sitemap.xml` | XML sitemap |
| `.well-known/mcp/server-card.json` | MCP server card (draft spec) |
| `.well-known/agent-skills/index.json` | Agent skills discovery |
| `.well-known/api-catalog` | API catalog (RFC 9727) |

## API

```ts
import { generateAll, generateRobots, generateLlmsTxt, generateSitemap } from '@agent-ready/core'

// Generate all files at once
const files = generateAll(config)
// files: Array<{ path: string; content: string }>

// Generate individual files
const [robots] = generateRobots(config)
```

## License

MIT
```

- [ ] **Step 3: Create `packages/next/README.md`**

Create `/Users/hectormendoza/Developer/agent-ready/packages/next/README.md`:

```markdown
# @agent-ready/next

Next.js App Router middleware that serves all agent-readiness files dynamically — no static files, no build step.

## Install

```bash
npm install @agent-ready/next @agent-ready/core
```

## Setup

**1. Create `agent-ready.config.ts`** in your project root:

```ts
import { defineConfig } from '@agent-ready/core'

export default defineConfig({
  site: {
    name: 'My Site',
    description: 'A brief description',
    baseUrl: 'https://example.com',
  },
  bots: { aiTrain: false, aiInput: false, search: true },
  content: { llmsTxt: true },
})
```

**2. Create or update `middleware.ts`:**

```ts
import { withAgentReady, AGENT_READY_MATCHER } from '@agent-ready/next'
import agentConfig from './agent-ready.config'

export default withAgentReady(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
```

## Composing with existing middleware

If you already have auth, i18n, or other middleware, pass it as the second argument:

```ts
import { withAgentReady, AGENT_READY_MATCHER } from '@agent-ready/next'
import { myAuthMiddleware } from './auth'
import agentConfig from './agent-ready.config'

export default withAgentReady(agentConfig, myAuthMiddleware)
export const config = { matcher: [...AGENT_READY_MATCHER, '/dashboard/:path*'] }
```

Agent-ready paths are handled first. All other paths pass through to your middleware untouched.

## `AGENT_READY_MATCHER`

```ts
['/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/.well-known/:path*']
```

## Response Headers

All matched paths return:

```
Content-Type: text/plain | application/xml | application/json (by extension)
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

## Requirements

- Next.js >= 14 (App Router)
- Node.js >= 18

## License

MIT
```

- [ ] **Step 4: Create `packages/cli/README.md`**

Create `/Users/hectormendoza/Developer/agent-ready/packages/cli/README.md`:

```markdown
# @agent-ready/cli

CLI for scaffolding and auditing AI agent readiness in Next.js projects.

## Install

```bash
npm install -g @agent-ready/cli
# or use without installing:
npx @agent-ready/cli
```

## Commands

### `init`

Scaffold `agent-ready.config.ts` and `middleware.ts` in the current directory:

```bash
agent-ready init
```

Skips files that already exist. Use `--force` to overwrite:

```bash
agent-ready init --force
```

### `audit`

Validate the format of generated agent-readiness files locally (no network):

```bash
agent-ready audit --url https://example.com
agent-ready audit --url https://example.com --name "My App" --description "A great app"
```

Runs 10 checks across `robots.txt`, `llms.txt`, and `sitemap.xml`. Exits 0 if all pass, 1 if any fail.

### `audit --live`

Also fetch the real endpoints from your deployed site and check what's actually being served:

```bash
agent-ready audit --url https://example.com --live
```

Runs 10 local format checks + 10 live HTTP checks = 20 total. Uses Node.js built-in `fetch` (Node >= 18). Network errors on individual endpoints are reported as failed checks — the command never crashes.

## All flags

```
init
  --force              Overwrite existing files

audit
  --url <url>          Required. Base URL of the site to audit.
  --name <name>        Site name for generated config (default: "My Site")
  --description <desc> Site description (default: "A site")
  --live               Also fetch real endpoints and check HTTP responses

--help, -h             Show help
--version, -v          Show version
```

## Requirements

- Node.js >= 18

## License

MIT
```

- [ ] **Step 5: Commit**

```bash
git add README.md packages/core/README.md packages/next/README.md packages/cli/README.md
git commit -m "docs: add READMEs for all packages and root monorepo"
```

---

## Task 8: Build Verification

- [ ] **Step 1: Install dependencies (picks up @changesets/cli)**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm install
```

Expected: `pnpm-lock.yaml` updated, `@changesets/cli` installed in root `node_modules`. No errors.

- [ ] **Step 2: Build all packages**

```bash
pnpm -r build
```

Expected output (all three succeed):
```
packages/core build: ESM ⚡️ Build success
packages/core build: CJS ⚡️ Build success
packages/core build: DTS ⚡️ Build success
packages/next build: ESM ⚡️ Build success
packages/next build: CJS ⚡️ Build success
packages/next build: DTS ⚡️ Build success
packages/cli build: ESM ⚡️ Build success
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass. Count: 69 core + 30 next + ~39 cli = ~138 total. Zero failures.

- [ ] **Step 4: Smoke-test the CLI binary**

```bash
# Help (should now show --live and --force)
node packages/cli/dist/index.mjs --help

# Local audit
node packages/cli/dist/index.mjs audit --url https://example.com

# init --force in a temp dir
mkdir /tmp/ar-test && node packages/cli/dist/index.mjs init && ls /tmp/ar-test && rm -rf /tmp/ar-test
```

Expected:
- `--help` shows `--live` and `--force` in the commands section
- `audit` completes with `Score: 10/10 checks passed ✅`
- `init` creates both files

- [ ] **Step 5: Verify `withAgentReady` export from built dist**

```bash
node --input-type=module <<'EOF'
import { agentReadyMiddleware, withAgentReady, AGENT_READY_MATCHER } from './packages/next/dist/index.mjs'
console.log('withAgentReady type:', typeof withAgentReady)
console.log('agentReadyMiddleware type:', typeof agentReadyMiddleware)
console.log('Matcher:', AGENT_READY_MATCHER)
EOF
```

Expected:
```
withAgentReady type: function
agentReadyMiddleware type: function
Matcher: [ '/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/.well-known/:path*' ]
```

- [ ] **Step 6: Final commit**

```bash
git add pnpm-lock.yaml
git commit -m "chore: phase 2 build verification complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by |
|---|---|
| `withAgentReady(config, next?)` | Task 1 |
| `init` scaffold uses `withAgentReady` | Task 2 |
| `--force` flag for `init` | Task 2 |
| `live-audit.ts` with 10 HTTP checks | Task 3 |
| `--live` flag wired into CLI | Task 4 |
| `printAuditGroups` extracted | Task 4 |
| `parseFlags` handles boolean flags | Task 4 |
| `isMain` guard for testability | Task 4 |
| `index.ts` integration tests | Task 5 |
| npm metadata on all 3 packages | Task 6 |
| MIT LICENSE | Task 6 |
| `@changesets/cli` setup | Task 6 |
| Root README | Task 7 |
| Per-package READMEs | Task 7 |
| Build + smoke test verification | Task 8 |

All spec requirements covered. No gaps.
