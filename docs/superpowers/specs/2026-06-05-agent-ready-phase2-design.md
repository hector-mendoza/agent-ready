# agent-ready Phase 2 — Design Spec

**Date:** 2026-06-05
**Status:** Approved
**Scope:** Middleware composition, live audit, npm publishing prep, `--force` flag, index.ts tests

---

## Context

Phase 1 delivered three packages: `@agent-ready/core` (generators), `@agent-ready/next` (middleware), `@agent-ready/cli` (init + audit). Phase 2 closes the remaining gaps before the packages are suitable for npm publishing.

**Changes span all three packages plus the monorepo root.**

---

## 1. `withAgentReady()` — Middleware Composition (`@agent-ready/next`)

### Problem

Users who already have a `middleware.ts` (auth, i18n, feature flags) cannot use `agentReadyMiddleware` directly without manual wiring. The `init` scaffold generates a standalone middleware that replaces rather than composes.

### API

```ts
export function withAgentReady(
  config: AgentReadyConfig,
  next?: (request: NextRequest) => NextResponse | Promise<NextResponse>
): (request: NextRequest) => NextResponse | Promise<NextResponse>
```

**Behavior:**

1. Runs `agentReadyMiddleware(config)` on the incoming request
2. If the response has a `Content-Type` header → agent-ready matched the path → return that response immediately
3. If no `Content-Type` header → path was not matched → call `next(request)` if provided, otherwise `NextResponse.next()`

**Detection logic:** the existing `agentReadyMiddleware` returns `NextResponse.next()` for unmatched paths. `NextResponse.next()` does not set `Content-Type`. Matched paths always set `Content-Type`. This is a reliable, zero-cost discriminator — no path matching duplication needed.

### User Setup

**New project (no existing middleware):**
```ts
// middleware.ts
import { withAgentReady, AGENT_READY_MATCHER } from '@agent-ready/next'
import agentConfig from './agent-ready.config'

export default withAgentReady(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
```

**Existing middleware:**
```ts
// middleware.ts
import { withAgentReady, AGENT_READY_MATCHER } from '@agent-ready/next'
import { myAuthMiddleware } from './auth'
import agentConfig from './agent-ready.config'

export default withAgentReady(agentConfig, myAuthMiddleware)
export const config = { matcher: [...AGENT_READY_MATCHER, '/dashboard/:path*'] }
```

### `init` Scaffold Update

`runInit` generates `withAgentReady` instead of `agentReadyMiddleware` in the scaffolded `middleware.ts`. The optional second arg means it works for both the simple and composed cases — the generated file is the same regardless.

Generated `middleware.ts`:
```ts
import { withAgentReady, AGENT_READY_MATCHER } from '@agent-ready/next'
import agentConfig from './agent-ready.config'

export default withAgentReady(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
```

Manual snippet (shown when `middleware.ts` already exists) updated to use `withAgentReady` and include composition example.

### Exports

Add `withAgentReady` to `packages/next/src/index.ts`.

### Tests (new, added to `middleware.test.ts`)

- `withAgentReady` with no `next` arg: matched paths served, unmatched pass through
- `withAgentReady` with a `next` fn: matched paths served without calling `next`, unmatched paths call `next`
- `withAgentReady` with an async `next` fn: resolves correctly
- `next` is never called for agent-ready paths

---

## 2. `audit --live` — Live URL Checking (`@agent-ready/cli`)

### Problem

`audit` validates the *format* of what the config *would* generate locally. It cannot confirm what the live site is actually serving.

### Design

**Default behavior unchanged** — `audit --url <url>` runs the existing 10 local format checks.

**New `--live` flag** — additionally fetches real endpoints and runs HTTP checks:

```bash
agent-ready audit --url https://example.com --live
```

### Live Checks

Uses Node.js built-in `fetch` (Node >= 18). Fetches concurrently with `Promise.all`. Network failures on individual endpoints are caught per-request and reported as failed checks (no crash).

**10 live checks:**

| Endpoint | Check | Pass condition |
|---|---|---|
| `GET /robots.txt` | HTTP status | 200 |
| `GET /robots.txt` | Content-Type | contains `text/plain` |
| `GET /robots.txt` | Content-Signal | body contains `Content-Signal:` |
| `GET /llms.txt` | HTTP status | 200 |
| `GET /llms.txt` | H1 heading | body matches `/^# .+/m` |
| `GET /sitemap.xml` | HTTP status | 200 |
| `GET /sitemap.xml` | Content-Type | contains `application/xml` |
| `GET /sitemap.xml` | urlset | body contains `<urlset` |
| `GET /.well-known/mcp/server-card.json` | HTTP status | 200 |
| `GET /.well-known/mcp/server-card.json` | Content-Type | contains `application/json` |

### Output Format

When `--live` is passed, output is split into two clearly labelled sections:

```
agent-ready audit — https://example.com

── Local format checks ──────────────────────────
robots.txt
  ✅ Sitemap pointer present
  ✅ Content-Signal: ai-train directive present
  ✅ Content-Signal: ai-input directive present
  ✅ Content-Signal: search directive present
  ✅ General User-agent: * block present

llms.txt
  ✅ Starts with # heading
  ✅ Has > blockquote description

sitemap.xml
  ✅ Valid XML declaration
  ✅ Has <urlset> namespace
  ✅ Has <loc> entry

── Live checks (https://example.com) ───────────
/robots.txt
  ✅ Returns HTTP 200
  ✅ Content-Type: text/plain
  ✅ Content-Signal directive present

/llms.txt
  ✅ Returns HTTP 200
  ✅ Starts with # heading

/sitemap.xml
  ✅ Returns HTTP 200
  ✅ Content-Type: application/xml
  ✅ Has <urlset> element

/.well-known/mcp/server-card.json
  ✅ Returns HTTP 200
  ✅ Content-Type: application/json

Score: 20/20 checks passed ✅
```

Network error example:
```
/robots.txt
  ❌ Returns HTTP 200 (ECONNREFUSED — could not reach https://example.com)
```

### Implementation

New file: `packages/cli/src/commands/live-audit.ts`

```ts
export interface LiveCheckResult {
  label: string
  passed: boolean
}

export interface LiveAuditResult {
  checks: LiveCheckResult[]
  passed: number
  total: number
}

export async function runLiveAudit(url: string): Promise<LiveAuditResult>
export function printLiveAuditResult(url: string, result: LiveAuditResult): void
```

`audit.ts` updated to accept `--live` flag and call `runLiveAudit` after `runAudit`. Combined score covers both local + live checks. Exit 1 if any check fails across either set.

### Tests

- All 10 live checks pass with mocked `fetch` (happy path)
- Network error on one endpoint → that check fails, others unaffected
- Non-200 status → check fails with status code in label
- Wrong Content-Type → check fails

Mocking strategy: `vi.stubGlobal('fetch', mockFetch)` in Vitest — no extra libraries.

---

## 3. `init --force` (`@agent-ready/cli`)

### Behavior

```bash
agent-ready init --force
```

Skips `existsSync` checks for both `agent-ready.config.ts` and `middleware.ts`. Overwrites existing files unconditionally.

Output uses `pass()` same as normal creation:
```
  ✅ Created agent-ready.config.ts
  ✅ Created middleware.ts

✅ Done! Edit agent-ready.config.ts to match your site, then run agent-ready audit.
```

### Implementation

`runInit(cwd?, force?)` — second optional parameter. `index.ts` parses `--force` from args and passes it through.

### Tests

- `--force` overwrites existing `agent-ready.config.ts`
- `--force` overwrites existing `middleware.ts`
- Without `--force`, existing files are still skipped (regression)

---

## 4. CLI `index.ts` Integration Tests

New file: `packages/cli/src/__tests__/index.test.ts`

### `parseFlags` unit tests

```ts
parseFlags(['--url', 'https://example.com'])
  → { url: 'https://example.com' }

parseFlags(['--url', 'https://example.com', '--name', 'My App', '--description', 'A site'])
  → { url: 'https://example.com', name: 'My App', description: 'A site' }

parseFlags(['--name'])          → {}  // trailing flag with no value: ignored
parseFlags([])                  → {}
parseFlags(['--url', '--name']) → {}  // next arg starts with '--': skipped
```

### Command dispatch tests

Uses `vi.spyOn` on `runInit` and `runAudit` to avoid file I/O and network calls. Captures `console.log` / `console.error` output via `vi.spyOn`.

| Scenario | Assertion |
|---|---|
| `audit --url https://example.com` | calls `runAudit` with correct flags |
| `audit` (no `--url`) | logs error, calls `process.exit(1)` |
| `--version` | logs `0.1.0` |
| `-v` | logs `0.1.0` |
| `--help` | logs help text containing `agent-ready` |
| `-h` | same |
| `help` | same |
| unknown command | calls `process.exit(1)` |
| no command | calls `process.exit(0)` |

`process.exit` is mocked via `vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })` to prevent test runner from actually exiting.

---

## 5. npm Publishing Prep

### Package Metadata

Added to all three `package.json` files (`@agent-ready/core`, `@agent-ready/next`, `@agent-ready/cli`):

```json
{
  "license": "MIT",
  "author": "Hector Mendoza <hec1702@gmail.com>",
  "keywords": ["agent-ready", "ai", "llms", "robots.txt", "llms.txt", "isitagentready"],
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

Package-specific `keywords` additions:
- `@agent-ready/core`: add `"generator"`, `"sitemap"`, `"mcp"`
- `@agent-ready/next`: add `"nextjs"`, `"middleware"`, `"app-router"`
- `@agent-ready/cli`: add `"cli"`, `"audit"`, `"scaffold"`

### LICENSE

MIT license file at repo root (`/LICENSE`). Standard MIT text with `Copyright (c) 2026 Hector Mendoza`.

### Changesets

Install `@changesets/cli` as root devDependency.

`.changeset/config.json`:
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

Root `package.json` scripts added:
```json
{
  "changeset": "changeset",
  "version-packages": "changeset version",
  "release": "pnpm -r build && changeset publish"
}
```

### READMEs

Four README files:

**`README.md` (root)** — what is agent-ready, packages overview, quick start for Next.js, local development setup (`pnpm install`, `pnpm build`, `pnpm test`)

**`packages/core/README.md`** — `defineConfig` API, all config options, list of generated files with their paths, generator function signatures

**`packages/next/README.md`** — installation, `withAgentReady` setup (simple + composed), `AGENT_READY_MATCHER` reference, response headers

**`packages/cli/README.md`** — `init` usage, `audit` usage with `--live` flag, all flags reference

### Publish Workflow

```bash
# 1. Describe changes
pnpm changeset

# 2. Bump versions + generate CHANGELOG.md
pnpm version-packages

# 3. Build + publish all packages
pnpm release
```

---

## Out of Scope (Phase 2)

- GitHub Actions CI/CD for automated publishing
- `@agent-ready/vite` package
- Interactive prompts during `init`
- Pages Router support
- `next export` / static site support
- Reading `agent-ready.config.ts` from disk in `audit` (requires tsx/jiti)
