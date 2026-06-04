# @agent-ready/cli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `packages/cli` to the monorepo — a zero-dependency CLI binary with `agent-ready init` (scaffolds config + middleware files) and `agent-ready audit` (validates generated file formats locally).

**Architecture:** Single ESM binary (`dist/index.mjs` with shebang). `index.ts` parses `process.argv` and dispatches to `commands/init.ts` or `commands/audit.ts`. Both commands are pure functions with injectable `cwd`/flags for testability. `output.ts` provides ANSI console helpers. No external runtime dependencies — only `@agent-ready/core`.

**Tech Stack:** pnpm workspaces, TypeScript 5.x strict ESM, tsup (ESM-only with shebang banner), Vitest, Node.js fs (built-in), `@agent-ready/core` (workspace dep)

---

## File Map

```
packages/cli/
├── package.json                       # @agent-ready/cli, bin: agent-ready → dist/index.mjs
├── tsconfig.json
├── tsup.config.ts                     # ESM-only, banner shebang, no dts
└── src/
    ├── output.ts                      # pass(), fail(), warn(), info() with ANSI colors
    ├── commands/
    │   ├── init.ts                    # runInit(cwd?) — writes config + middleware files
    │   └── audit.ts                   # runAudit(flags) → AuditResult + printAuditResult()
    ├── index.ts                       # entry point: parseFlags(), dispatch, help, version
    └── __tests__/
        ├── audit.test.ts
        └── init.test.ts
```

---

### Task 1: packages/cli scaffold

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`

- [ ] **Step 1: Create directories**

```bash
mkdir -p /Users/hectormendoza/Developer/agent-ready/packages/cli/src/commands
mkdir -p /Users/hectormendoza/Developer/agent-ready/packages/cli/src/__tests__
```

- [ ] **Step 2: Create packages/cli/package.json**

```json
{
  "name": "@agent-ready/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "agent-ready": "./dist/index.mjs"
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
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```
Save to `packages/cli/package.json`.

- [ ] **Step 3: Create packages/cli/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```
Save to `packages/cli/tsconfig.json`.

- [ ] **Step 4: Create packages/cli/tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outExtension: () => ({ js: '.mjs' }),
  dts: false,
  clean: true,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
})
```
Save to `packages/cli/tsup.config.ts`.

- [ ] **Step 5: Install dependencies from repo root**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm install
```
Expected: pnpm resolves `@agent-ready/core: workspace:*`, installs tsup, typescript, vitest. `pnpm-lock.yaml` updated.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/package.json packages/cli/tsconfig.json packages/cli/tsup.config.ts pnpm-lock.yaml
git commit -m "chore: scaffold @agent-ready/cli package"
```

---

### Task 2: output.ts

**Files:**
- Create: `packages/cli/src/output.ts`

No unit tests — these are simple `console.log` wrappers. Behavior verified via integration tests in Tasks 3–4 (which import output.ts).

- [ ] **Step 1: Create packages/cli/src/output.ts**

```ts
const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const Z = '\x1b[0m'

export function pass(msg: string): void {
  console.log(`  ${G}✅${Z} ${msg}`)
}

export function fail(msg: string): void {
  console.log(`  ${R}❌${Z} ${msg}`)
}

export function warn(msg: string): void {
  console.log(`${Y}⚠️ ${Z} ${msg}`)
}

export function info(msg: string): void {
  console.log(msg)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm exec tsc --noEmit
```
Expected: no errors (even without other src files, since tsconfig `include: ["src"]` only processes what exists).

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/output.ts
git commit -m "feat(cli): add ANSI console output helpers"
```

---

### Task 3: audit.ts (TDD)

**Files:**
- Create: `packages/cli/src/commands/audit.ts`
- Create: `packages/cli/src/__tests__/audit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/__tests__/audit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { runAudit } from '../commands/audit'

const flags = { url: 'https://example.com', name: 'Test Site', description: 'A test site' }

describe('runAudit', () => {
  it('returns an AuditResult with 10 total checks', async () => {
    const result = await runAudit(flags)
    expect(result.total).toBe(10)
  })

  it('all 10 checks pass for a valid config', async () => {
    const result = await runAudit(flags)
    expect(result.passed).toBe(10)
  })

  it('robots.txt — Sitemap pointer check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('Sitemap pointer'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — ai-train directive check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('ai-train'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — ai-input directive check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('ai-input'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — search directive check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('search directive'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — User-agent wildcard check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('User-agent'))
    expect(check?.passed).toBe(true)
  })

  it('llms.txt — heading check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('heading'))
    expect(check?.passed).toBe(true)
  })

  it('llms.txt — blockquote check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('blockquote'))
    expect(check?.passed).toBe(true)
  })

  it('sitemap.xml — XML declaration check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('XML declaration'))
    expect(check?.passed).toBe(true)
  })

  it('sitemap.xml — urlset namespace check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('urlset'))
    expect(check?.passed).toBe(true)
  })

  it('sitemap.xml — loc entry check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('<loc>'))
    expect(check?.passed).toBe(true)
  })

  it('uses "My Site" as default name when not provided', async () => {
    const result = await runAudit({ url: 'https://example.com' })
    expect(result.passed).toBe(result.total)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```
Expected: FAIL — `Cannot find module '../commands/audit'`

- [ ] **Step 3: Implement audit.ts**

Create `packages/cli/src/commands/audit.ts`:

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

export function printAuditResult(url: string, result: AuditResult): void {
  info(`\nagent-ready audit — ${url}\n`)

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

  const allPassed = result.passed === result.total
  info(`Score: ${result.passed}/${result.total} checks passed ${allPassed ? '✅' : '❌'}`)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```
Expected: 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/audit.ts packages/cli/src/__tests__/audit.test.ts
git commit -m "feat(cli): add audit command with 10 format checks"
```

---

### Task 4: init.ts (TDD)

**Files:**
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/__tests__/init.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/__tests__/init.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInit } from '../commands/init'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'agent-ready-test-'))
}

describe('runInit', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true })
    dirs.length = 0
  })

  it('creates agent-ready.config.ts in the given directory', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    expect(existsSync(join(dir, 'agent-ready.config.ts'))).toBe(true)
  })

  it('agent-ready.config.ts contains defineConfig import', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'agent-ready.config.ts'), 'utf-8')
    expect(content).toContain("from '@agent-ready/core'")
    expect(content).toContain('defineConfig')
  })

  it('agent-ready.config.ts contains site.name and site.baseUrl fields', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'agent-ready.config.ts'), 'utf-8')
    expect(content).toContain('name:')
    expect(content).toContain('baseUrl:')
  })

  it('creates middleware.ts in the given directory', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    expect(existsSync(join(dir, 'middleware.ts'))).toBe(true)
  })

  it('middleware.ts imports agentReadyMiddleware and AGENT_READY_MATCHER', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'middleware.ts'), 'utf-8')
    expect(content).toContain('agentReadyMiddleware')
    expect(content).toContain('AGENT_READY_MATCHER')
  })

  it('does NOT overwrite existing agent-ready.config.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const configPath = join(dir, 'agent-ready.config.ts')
    writeFileSync(configPath, 'existing content', 'utf-8')
    await runInit(dir)
    expect(readFileSync(configPath, 'utf-8')).toBe('existing content')
  })

  it('does NOT overwrite existing middleware.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const mwPath = join(dir, 'middleware.ts')
    writeFileSync(mwPath, 'existing middleware', 'utf-8')
    await runInit(dir)
    expect(readFileSync(mwPath, 'utf-8')).toBe('existing middleware')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```
Expected: FAIL — `Cannot find module '../commands/init'`

- [ ] **Step 3: Implement init.ts**

Create `packages/cli/src/commands/init.ts`:

```ts
import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { warn, info } from '../output'

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

const MIDDLEWARE_CONTENT = `import { agentReadyMiddleware, AGENT_READY_MATCHER } from '@agent-ready/next'
import agentConfig from './agent-ready.config'

export default agentReadyMiddleware(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
`

const MIDDLEWARE_SNIPPET = `  import { agentReadyMiddleware, AGENT_READY_MATCHER } from '@agent-ready/next'
  import agentConfig from './agent-ready.config'

  export default agentReadyMiddleware(agentConfig)
  export const config = { matcher: AGENT_READY_MATCHER }`

export async function runInit(cwd: string = process.cwd()): Promise<void> {
  const configPath = join(cwd, 'agent-ready.config.ts')
  const middlewarePath = join(cwd, 'middleware.ts')

  if (existsSync(configPath)) {
    warn('agent-ready.config.ts already exists, skipping')
  } else {
    writeFileSync(configPath, CONFIG_CONTENT, 'utf-8')
    info('✅ Created agent-ready.config.ts')
  }

  if (existsSync(middlewarePath)) {
    warn('middleware.ts already exists. Add the following to it manually:\n')
    info(MIDDLEWARE_SNIPPET)
  } else {
    writeFileSync(middlewarePath, MIDDLEWARE_CONTENT, 'utf-8')
    info('✅ Created middleware.ts')
  }

  info('\nDone! Edit agent-ready.config.ts to match your site, then run:')
  info('  agent-ready audit --url https://yoursite.com')
}
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```
Expected: 20 tests PASS (13 audit + 7 init).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/__tests__/init.test.ts
git commit -m "feat(cli): add init command — scaffolds config and middleware files"
```

---

### Task 5: index.ts — entry point

**Files:**
- Create: `packages/cli/src/index.ts`

No unit tests — index.ts calls `process.exit()` which makes it awkward to unit test. Behavior is verified by the build smoke test in Task 6.

- [ ] **Step 1: Create packages/cli/src/index.ts**

```ts
import { runInit } from './commands/init'
import { runAudit, printAuditResult } from './commands/audit'

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg.startsWith('--') && next !== undefined && !next.startsWith('--')) {
      flags[arg.slice(2)] = next
      i++
    }
  }
  return flags
}

function printHelp(): void {
  console.log(`
agent-ready — AI Agent Readiness CLI

Commands:
  init                       Scaffold agent-ready.config.ts and middleware.ts
  audit --url <url>          Validate agent-readiness files locally

Options:
  --url <url>                Site base URL (required for audit)
  --name <name>              Site name (optional, default: "My Site")
  --description <desc>       Site description (optional)
  --help, -h                 Show this help
  --version, -v              Show version

Examples:
  agent-ready init
  agent-ready audit --url https://example.com
  agent-ready audit --url https://example.com --name "My App"
`.trim())
}

function printVersion(): void {
  console.log('0.1.0')
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2)

  switch (command) {
    case 'init': {
      await runInit()
      break
    }
    case 'audit': {
      const flags = parseFlags(rest)
      if (!flags.url) {
        console.error('Error: --url is required for audit')
        console.error('Usage: agent-ready audit --url https://example.com')
        process.exit(1)
      }
      const result = await runAudit(flags as { url: string; name?: string; description?: string })
      printAuditResult(flags.url, result)
      if (result.passed < result.total) process.exit(1)
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

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
```

Note: imports use no extension (consistent with the rest of the monorepo). tsup bundles all imports into a single `dist/index.mjs` file, so Node.js resolution of relative paths is handled at build time.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm test
```
Expected: 20 tests PASS (unchanged — index.ts has no unit tests).

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat(cli): add entry point with arg parsing and command dispatch"
```

---

### Task 6: Build verification

**Goal:** Build the binary, verify the shebang, smoke-test both commands.

- [ ] **Step 1: Run the build**

```bash
cd /Users/hectormendoza/Developer/agent-ready/packages/cli && pnpm build
```
Expected: tsup emits `dist/index.mjs`. No errors.

- [ ] **Step 2: Verify shebang in dist/index.mjs**

```bash
head -1 /Users/hectormendoza/Developer/agent-ready/packages/cli/dist/index.mjs
```
Expected:
```
#!/usr/bin/env node
```

- [ ] **Step 3: Make binary executable and smoke-test --help**

```bash
chmod +x /Users/hectormendoza/Developer/agent-ready/packages/cli/dist/index.mjs
node /Users/hectormendoza/Developer/agent-ready/packages/cli/dist/index.mjs --help
```
Expected: prints help text including `Commands:`, `init`, `audit`.

- [ ] **Step 4: Smoke-test audit**

```bash
node /Users/hectormendoza/Developer/agent-ready/packages/cli/dist/index.mjs audit --url https://example.com --name "Test Site"
```
Expected: prints score `10/10 checks passed ✅` and exits 0.

- [ ] **Step 5: Smoke-test init in a temp directory**

```bash
TMPDIR=$(mktemp -d)
node /Users/hectormendoza/Developer/agent-ready/packages/cli/dist/index.mjs init --cwd "$TMPDIR" 2>/dev/null || \
node /Users/hectormendoza/Developer/agent-ready/packages/cli/dist/index.mjs init
ls /tmp 2>/dev/null || true
```

Actually, `init` uses `process.cwd()` — run it from a temp dir:

```bash
TMPDIR=$(mktemp -d) && cd "$TMPDIR" && \
node /Users/hectormendoza/Developer/agent-ready/packages/cli/dist/index.mjs init && \
ls && cat agent-ready.config.ts | head -3
```
Expected output includes:
```
✅ Created agent-ready.config.ts
✅ Created middleware.ts
Done! Edit agent-ready.config.ts ...
```
And `agent-ready.config.ts` starts with `import { defineConfig }`.

- [ ] **Step 6: Run full monorepo test suite**

```bash
cd /Users/hectormendoza/Developer/agent-ready && pnpm test
```
Expected: all tests pass (69 core + 26 next + 20 cli = 115 total), zero failures.

- [ ] **Step 7: Commit**

```bash
cd /Users/hectormendoza/Developer/agent-ready
git add -A
git commit -m "chore(cli): verify build — binary runs, 20 tests passing"
```
