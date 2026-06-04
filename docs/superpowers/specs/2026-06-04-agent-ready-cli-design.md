# agent-ready/cli — Design Spec

**Date:** 2026-06-04
**Status:** Approved
**Scope:** `packages/cli` — `agent-ready init` and `agent-ready audit` CLI commands

---

## Context

`@agent-ready/cli` is the third package in the `agent-ready` monorepo. It provides a zero-dependency command-line tool with two commands:

- **`init`** — scaffolds `agent-ready.config.ts` and `middleware.ts` in the user's Next.js project
- **`audit`** — validates the format of generated agent-readiness files locally (no network)

**Depends on:** `@agent-ready/core` (workspace dependency)
**Runtime deps:** none beyond `@agent-ready/core`
**Node target:** >= 18

---

## CLI Usage

```bash
agent-ready init                                        # scaffold config + middleware
agent-ready audit --url https://example.com             # validate format locally
agent-ready audit --url https://example.com --name "My App" --description "..."
agent-ready --help
agent-ready --version
```

---

## Package Structure

```
packages/cli/
├── src/
│   ├── commands/
│   │   ├── init.ts         # init command implementation
│   │   └── audit.ts        # audit command implementation
│   ├── output.ts           # console helpers: pass(), fail(), warn(), info()
│   └── index.ts            # entry point: parse args → dispatch → help/version
├── package.json            # bin: { "agent-ready": "./dist/index.mjs" }
├── tsconfig.json
└── tsup.config.ts
```

### `package.json` shape

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

Note: no `peerDependencies` — the CLI is a standalone tool, not a library.

---

## Arg Parsing (`src/index.ts`)

Hand-rolled, zero dependencies. Entry point logic:

```ts
#!/usr/bin/env node
const [command, ...rest] = process.argv.slice(2)

switch (command) {
  case 'init':    await init(rest); break
  case 'audit':   await audit(parseFlags(rest)); break
  case '--help':
  case '-h':
  case 'help':    printHelp(); break
  case '--version':
  case '-v':      printVersion(); break
  default:        printHelp(); process.exit(1)
}
```

`parseFlags(args: string[])` returns `{ url?: string; name?: string; description?: string }` by scanning for `--key value` pairs.

---

## `init` Command (`src/commands/init.ts`)

### Behavior

1. Read `process.cwd()` as the target directory
2. If `agent-ready.config.ts` exists → print `⚠️  agent-ready.config.ts already exists, skipping` and skip it
3. If it does not exist → write the file with the example config below
4. If `middleware.ts` exists with content → print `⚠️  middleware.ts already exists.` followed by the snippet to add manually
5. If `middleware.ts` does not exist → write the file with the template below
6. Print final `✅ Done! Edit agent-ready.config.ts to match your site, then run agent-ready audit.`

### Generated `agent-ready.config.ts`

```ts
import { defineConfig } from '@agent-ready/core'

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
```

### Generated `middleware.ts` (when file does not exist)

```ts
import { agentReadyMiddleware, AGENT_READY_MATCHER } from '@agent-ready/next'
import agentConfig from './agent-ready.config'

export default agentReadyMiddleware(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
```

### Manual snippet (shown when `middleware.ts` already exists)

```
⚠️  middleware.ts already exists. Add the following to it manually:

  import { agentReadyMiddleware, AGENT_READY_MATCHER } from '@agent-ready/next'
  import agentConfig from './agent-ready.config'

  export default agentReadyMiddleware(agentConfig)
  export const config = { matcher: AGENT_READY_MATCHER }
```

---

## `audit` Command (`src/commands/audit.ts`)

### Required flag

- `--url <baseUrl>` — required. If missing, print error and exit 1.

### Optional flags

- `--name <name>` — site name for the generated config (default: `"My Site"`)
- `--description <description>` — site description (default: `"A site"`)

### Behavior

1. Parse flags; error if `--url` is missing
2. Build minimal `AgentReadyConfig`:
   ```ts
   {
     site: { name, description, baseUrl: url },
     bots: { aiTrain: false, aiInput: false, search: true },
     content: { llmsTxt: true },
   }
   ```
3. Call `generateRobots(config)`, `generateLlmsTxt(config)`, `generateSitemap(config, { date: '2026-01-01' })`
4. Run checks on each generated file's `content` string
5. Print results grouped by file, print final score
6. Exit 0 if all checks pass, exit 1 if any fail

### Checks

**robots.txt** (5 checks):
| Check | Pass condition |
|-------|---------------|
| Sitemap pointer | content includes `Sitemap:` |
| ai-train directive | content includes `Content-Signal: ai-train=` |
| ai-input directive | content includes `Content-Signal: ai-input=` |
| search directive | content includes `Content-Signal: search=` |
| General wildcard block | content includes `User-agent: *` |

**llms.txt** (2 checks):
| Check | Pass condition |
|-------|---------------|
| H1 heading | content matches `/^# .+/m` |
| Blockquote description | content includes `> ` |

**sitemap.xml** (3 checks):
| Check | Pass condition |
|-------|---------------|
| XML declaration | content matches `/^<\?xml/` |
| urlset namespace | content includes `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"` |
| loc entry | content includes `<loc>` |

**Total: 10 checks**

### Output format

```
agent-ready audit — https://example.com

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

Score: 10/10 checks passed ✅
```

---

## `output.ts` — Console Helpers

Internal (not exported from index.ts). Provides:

```ts
export function pass(msg: string): void   // ✅ green
export function fail(msg: string): void   // ❌ red
export function warn(msg: string): void   // ⚠️  yellow
export function info(msg: string): void   // plain log
```

Uses ANSI escape codes directly (`\x1b[32m` green, `\x1b[31m` red, `\x1b[33m` yellow, `\x1b[0m` reset). No chalk, no colors package.

---

## `tsup.config.ts`

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],          // CLI only needs ESM — no CJS needed for a binary
  outExtension: () => ({ js: '.mjs' }),
  dts: false,               // no type declarations needed for a binary
  clean: true,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },  // injects shebang into dist/index.mjs
})
```

Note: ESM-only (no CJS) since this is a CLI binary, not a library. tsup's `banner` injects the shebang.

---

## Testing Strategy

**Framework:** Vitest

Each command is a pure function (takes args, uses `fs` and `console`) — testable by:
- **`init.ts`**: write to a temp directory, assert file contents
- **`audit.ts`**: call `runAudit(flags)` with test flags, capture return value (array of check results) rather than testing console output directly
- **`output.ts`**: trivial, skip unit tests
- **`index.ts`**: integration test for arg dispatch

`audit.ts` returns a structured result so it's testable without capturing stdout:

```ts
export interface CheckResult {
  label: string
  passed: boolean
}

export interface AuditResult {
  checks: CheckResult[]
  passed: number
  total: number
}

export async function runAudit(flags: { url: string; name?: string; description?: string }): Promise<AuditResult>
```

`init.ts` accepts an optional `cwd` parameter for testability:

```ts
export async function runInit(cwd?: string): Promise<void>
```

---

## `tsconfig.json`

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

---

## Out of Scope (Phase 1)

- Reading `agent-ready.config.ts` from the user's project (requires tsx/jiti)
- `--url` flag for live URL checks against isitagentready.com
- Interactive prompts during `init`
- `--force` flag to overwrite existing files
- Publishing to npm
