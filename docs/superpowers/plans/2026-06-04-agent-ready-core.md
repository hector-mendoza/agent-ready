# agent-ready/core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `agent-ready` pnpm monorepo and implement `@agent-ready/core` — a zero-dependency TypeScript library that generates AI Agent Readiness files (robots.txt, llms.txt, sitemap.xml, MCP server card, agent skills index, API catalog) as pure `{ path, content }[]` arrays.

**Architecture:** Pure generator functions — no I/O, no network, no external deps. Each generator receives `AgentReadyConfig` and returns `GeneratedFile[]`. The caller writes files to disk. `generateAll()` composes all generators. Fully testable without mocks.

**Tech Stack:** pnpm workspaces, TypeScript 5.x (strict ESM), tsup (dual ESM+CJS build), Vitest

---

## File Map

```
agent-ready/
├── package.json                              # workspace root (private)
├── pnpm-workspace.yaml
└── packages/
    └── core/
        ├── package.json                      # @agent-ready/core
        ├── tsconfig.json
        ├── tsup.config.ts
        └── src/
            ├── config.ts                     # AgentReadyConfig types + defineConfig()
            ├── validate.ts                   # validate() + AgentReadyValidationError
            ├── index.ts                      # all public exports
            └── generators/
                ├── robots.ts                 # → robots.txt
                ├── llms-txt.ts               # → llms.txt (+ llms-full.txt)
                ├── sitemap.ts                # → sitemap.xml
                ├── mcp-server-card.ts        # → .well-known/mcp/server-card.json
                ├── agent-skills.ts           # → .well-known/agent-skills/index.json
                ├── api-catalog.ts            # → .well-known/api-catalog
                ├── generate-all.ts           # composes all generators
                └── __tests__/
                    ├── robots.test.ts
                    ├── llms-txt.test.ts
                    ├── sitemap.test.ts
                    ├── mcp-server-card.test.ts
                    ├── agent-skills.test.ts
                    ├── api-catalog.test.ts
                    └── generate-all.test.ts
```

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: Verify pnpm is available**

```bash
pnpm --version
```
Expected: `8.x.x` or higher. If not installed: `npm install -g pnpm`.

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "agent-ready",
  "private": true,
  "engines": {
    "node": ">=18",
    "pnpm": ">=8"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  }
}
```
Save to `package.json`.

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```
Save to `pnpm-workspace.yaml`.

- [ ] **Step 4: Create packages directory**

```bash
mkdir -p packages/core/src/generators/__tests__
```

- [ ] **Step 5: Commit**

```bash
git init
git add package.json pnpm-workspace.yaml
git commit -m "chore: init pnpm monorepo"
```

---

### Task 2: packages/core scaffold

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`

- [ ] **Step 1: Create packages/core/package.json**

```json
{
  "name": "@agent-ready/core",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```
Save to `packages/core/package.json`.

- [ ] **Step 2: Create packages/core/tsconfig.json**

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
Save to `packages/core/tsconfig.json`.

- [ ] **Step 3: Create packages/core/tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```
Save to `packages/core/tsup.config.ts`.

- [ ] **Step 4: Install dependencies**

```bash
cd packages/core && pnpm install
```
Expected: `node_modules` created, lockfile updated.

- [ ] **Step 5: Commit**

```bash
git add packages/core/package.json packages/core/tsconfig.json packages/core/tsup.config.ts pnpm-lock.yaml
git commit -m "chore: scaffold @agent-ready/core package"
```

---

### Task 3: Types + defineConfig

**Files:**
- Create: `packages/core/src/config.ts`
- Create: `packages/core/src/index.ts` (stub — will grow with each task)

- [ ] **Step 1: Create packages/core/src/config.ts**

```ts
export interface AgentReadyConfig {
  site: {
    name: string
    description: string
    baseUrl: string
    language?: string
  }
  content?: {
    llmsTxt?: boolean
    llmsFullTxt?: boolean
    markdownNegotiation?: boolean
    links?: Array<{ title: string; url: string; description?: string }>
  }
  bots?: {
    aiTrain?: boolean
    aiInput?: boolean
    search?: boolean
    allowedBots?: string[]
    blockedBots?: string[]
  }
  protocol?: {
    mcpServerCard?: boolean | MCPServerCardOptions
    agentSkills?: boolean
    apiCatalog?: boolean | APICatalogOptions
    oauth?: boolean
  }
  commerce?: boolean
}

export interface MCPServerCardOptions {
  name?: string
  description?: string
  capabilities?: string[]
  authType?: 'none' | 'oauth2' | 'api-key'
}

export interface APICatalogOptions {
  apis: Array<{
    title: string
    description?: string
    openapi?: string
  }>
}

export type GeneratedFile = { path: string; content: string }

export function defineConfig(config: AgentReadyConfig): AgentReadyConfig {
  return config
}
```

- [ ] **Step 2: Create stub index.ts**

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
```
Save to `packages/core/src/index.ts`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/core && pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/config.ts packages/core/src/index.ts
git commit -m "feat(core): add AgentReadyConfig types and defineConfig"
```

---

### Task 4: validate.ts

**Files:**
- Create: `packages/core/src/validate.ts`
- Create: `packages/core/src/generators/__tests__/validate.test.ts`

Note: tests live in `__tests__/` but `validate.ts` is in `src/`, not `generators/`. The test file goes in `src/__tests__/validate.test.ts`.

Actually — for simplicity, place the validate test in `packages/core/src/generators/__tests__/validate.test.ts` alongside the generator tests.

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validate, AgentReadyValidationError } from '../../validate'
import type { AgentReadyConfig } from '../../config'

const valid: AgentReadyConfig = {
  site: {
    name: 'My Site',
    description: 'A test site',
    baseUrl: 'https://example.com',
  },
}

describe('validate', () => {
  it('passes for a valid config', () => {
    expect(() => validate(valid)).not.toThrow()
  })

  it('throws AgentReadyValidationError when site.name is empty', () => {
    expect(() =>
      validate({ site: { name: '', description: 'ok', baseUrl: 'https://example.com' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when site.description is empty', () => {
    expect(() =>
      validate({ site: { name: 'ok', description: '  ', baseUrl: 'https://example.com' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when site.baseUrl is not a valid URL', () => {
    expect(() =>
      validate({ site: { name: 'ok', description: 'ok', baseUrl: 'not-a-url' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when site.baseUrl has a trailing slash', () => {
    expect(() =>
      validate({ site: { name: 'ok', description: 'ok', baseUrl: 'https://example.com/' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when apiCatalog options has empty apis array', () => {
    expect(() =>
      validate({ ...valid, protocol: { apiCatalog: { apis: [] } } })
    ).toThrow(AgentReadyValidationError)
  })

  it('error message lists all issues', () => {
    try {
      validate({ site: { name: '', description: '', baseUrl: '' } })
    } catch (e) {
      expect(e).toBeInstanceOf(AgentReadyValidationError)
      expect((e as AgentReadyValidationError).issues).toHaveLength(3)
    }
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../../validate'`

- [ ] **Step 3: Implement validate.ts**

Create `packages/core/src/validate.ts`:

```ts
import type { AgentReadyConfig } from './config'

export class AgentReadyValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      `agent-ready config validation failed:\n${issues.map((i) => `  - ${i}`).join('\n')}`
    )
    this.name = 'AgentReadyValidationError'
  }
}

export function validate(config: AgentReadyConfig): void {
  const issues: string[] = []

  if (!config.site?.name?.trim()) {
    issues.push('site.name is required and must not be empty')
  }
  if (!config.site?.description?.trim()) {
    issues.push('site.description is required and must not be empty')
  }
  if (!config.site?.baseUrl?.trim()) {
    issues.push('site.baseUrl is required')
  } else {
    try {
      new URL(config.site.baseUrl)
    } catch {
      issues.push(`site.baseUrl must be a valid URL, got "${config.site.baseUrl}"`)
    }
    if (config.site.baseUrl.endsWith('/')) {
      issues.push('site.baseUrl must not have a trailing slash')
    }
  }

  if (
    config.protocol?.apiCatalog &&
    typeof config.protocol.apiCatalog === 'object' &&
    config.protocol.apiCatalog.apis.length === 0
  ) {
    issues.push('protocol.apiCatalog.apis must not be empty when providing an options object')
  }

  if (issues.length > 0) {
    throw new AgentReadyValidationError(issues)
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: all validate tests PASS.

- [ ] **Step 5: Update index.ts to export validate**

Add to `packages/core/src/index.ts`:

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/validate.ts packages/core/src/generators/__tests__/validate.test.ts packages/core/src/index.ts
git commit -m "feat(core): add validate() with AgentReadyValidationError"
```

---

### Task 5: robots.ts generator

**Files:**
- Create: `packages/core/src/generators/robots.ts`
- Create: `packages/core/src/generators/__tests__/robots.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/robots.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateRobots } from '../robots'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test site', baseUrl: 'https://example.com' },
}

describe('generateRobots', () => {
  it('returns one file at robots.txt', () => {
    const files = generateRobots(base)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('robots.txt')
  })

  it('includes Sitemap pointer with baseUrl', () => {
    const content = generateRobots(base)[0].content
    expect(content).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('emits Content-Signal deny for ai-train when aiTrain is false', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: false } })[0].content
    expect(content).toContain('Content-Signal: ai-train=deny')
  })

  it('emits Content-Signal allow for ai-train when aiTrain is true', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: true } })[0].content
    expect(content).toContain('Content-Signal: ai-train=allow')
  })

  it('emits Content-Signal deny for ai-input when aiInput is false', () => {
    const content = generateRobots({ ...base, bots: { aiInput: false } })[0].content
    expect(content).toContain('Content-Signal: ai-input=deny')
  })

  it('emits Content-Signal allow for ai-input when aiInput is true', () => {
    const content = generateRobots({ ...base, bots: { aiInput: true } })[0].content
    expect(content).toContain('Content-Signal: ai-input=allow')
  })

  it('defaults search to allow when bots.search is not set', () => {
    const content = generateRobots(base)[0].content
    expect(content).toContain('Content-Signal: search=allow')
  })

  it('emits Content-Signal deny for search when search is false', () => {
    const content = generateRobots({ ...base, bots: { search: false } })[0].content
    expect(content).toContain('Content-Signal: search=deny')
  })

  it('blocks known AI training bots when aiTrain is false', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: false } })[0].content
    expect(content).toContain('User-agent: GPTBot')
    expect(content).toContain('User-agent: CCBot')
    expect(content).toContain('User-agent: Google-Extended')
    // The Disallow must appear AFTER the User-agent block
    const gpgIdx = content.indexOf('User-agent: GPTBot')
    const disallowIdx = content.indexOf('Disallow: /', gpgIdx)
    expect(disallowIdx).toBeGreaterThan(gpgIdx)
  })

  it('allows known AI training bots when aiTrain is true', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: true } })[0].content
    expect(content).toContain('User-agent: GPTBot')
    const gpgIdx = content.indexOf('User-agent: GPTBot')
    const allowIdx = content.indexOf('Allow: /', gpgIdx)
    expect(allowIdx).toBeGreaterThan(gpgIdx)
  })

  it('blocks known AI input bots when aiInput is false', () => {
    const content = generateRobots({ ...base, bots: { aiInput: false } })[0].content
    expect(content).toContain('User-agent: ClaudeBot')
    expect(content).toContain('User-agent: anthropic-ai')
    expect(content).toContain('User-agent: Bytespider')
  })

  it('appends custom blockedBots with Disallow: /', () => {
    const content = generateRobots({ ...base, bots: { blockedBots: ['BadBot', 'EvilCrawler'] } })[0].content
    expect(content).toContain('User-agent: BadBot')
    expect(content).toContain('User-agent: EvilCrawler')
    const badIdx = content.indexOf('User-agent: BadBot')
    const disIdx = content.indexOf('Disallow: /', badIdx)
    expect(disIdx).toBeGreaterThan(badIdx)
  })

  it('appends custom allowedBots with Allow: /', () => {
    const content = generateRobots({ ...base, bots: { allowedBots: ['FriendlyBot'] } })[0].content
    expect(content).toContain('User-agent: FriendlyBot')
    const idx = content.indexOf('User-agent: FriendlyBot')
    const allowIdx = content.indexOf('Allow: /', idx)
    expect(allowIdx).toBeGreaterThan(idx)
  })

  it('ends with a general User-agent: * Allow: / block', () => {
    const content = generateRobots(base)[0].content
    expect(content).toContain('User-agent: *\nAllow: /')
  })

  it('content ends with newline', () => {
    expect(generateRobots(base)[0].content.endsWith('\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../robots'`

- [ ] **Step 3: Implement robots.ts**

Create `packages/core/src/generators/robots.ts`:

```ts
import type { AgentReadyConfig, GeneratedFile } from '../config'

const AI_TRAINING_BOTS = [
  'GPTBot',
  'CCBot',
  'Diffbot',
  'Google-Extended',
  'FacebookBot',
  'PerplexityBot',
  'Omgilibot',
  'DataForSeoBot',
]

const AI_INPUT_BOTS = [
  'ClaudeBot',
  'anthropic-ai',
  'Bytespider',
  'cohere-ai',
  'AI2Bot',
  'Amazonbot',
]

function botBlock(agents: string[], directive: 'Allow: /' | 'Disallow: /'): string {
  return [...agents.map((a) => `User-agent: ${a}`), directive].join('\n')
}

export function generateRobots(config: AgentReadyConfig): GeneratedFile[] {
  const { site, bots = {} } = config
  const sections: string[] = []

  sections.push(
    [
      '# Content-Signal directives (Cloudflare)',
      `Content-Signal: ai-train=${bots.aiTrain === true ? 'allow' : 'deny'}`,
      `Content-Signal: ai-input=${bots.aiInput === true ? 'allow' : 'deny'}`,
      `Content-Signal: search=${bots.search === false ? 'deny' : 'allow'}`,
    ].join('\n')
  )

  sections.push(`Sitemap: ${site.baseUrl}/sitemap.xml`)

  sections.push(botBlock(AI_TRAINING_BOTS, bots.aiTrain === true ? 'Allow: /' : 'Disallow: /'))

  sections.push(botBlock(AI_INPUT_BOTS, bots.aiInput === true ? 'Allow: /' : 'Disallow: /'))

  if (bots.blockedBots?.length) {
    sections.push(botBlock(bots.blockedBots, 'Disallow: /'))
  }

  if (bots.allowedBots?.length) {
    sections.push(botBlock(bots.allowedBots, 'Allow: /'))
  }

  sections.push(['# General crawlers', 'User-agent: *', 'Allow: /'].join('\n'))

  return [{ path: 'robots.txt', content: sections.join('\n\n') + '\n' }]
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: all robots tests PASS.

- [ ] **Step 5: Update index.ts**

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
export { generateRobots } from './generators/robots'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/generators/robots.ts packages/core/src/generators/__tests__/robots.test.ts packages/core/src/index.ts
git commit -m "feat(core): add generateRobots() with Content-Signal and AI bot blocks"
```

---

### Task 6: llms-txt.ts generator

**Files:**
- Create: `packages/core/src/generators/llms-txt.ts`
- Create: `packages/core/src/generators/__tests__/llms-txt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/llms-txt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateLlmsTxt } from '../llms-txt'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'My Site', description: 'A great site', baseUrl: 'https://example.com' },
}

describe('generateLlmsTxt', () => {
  it('returns llms.txt by default', () => {
    const files = generateLlmsTxt(base)
    expect(files.map((f) => f.path)).toContain('llms.txt')
  })

  it('does not return llms-full.txt unless llmsFullTxt is true', () => {
    const files = generateLlmsTxt(base)
    expect(files.map((f) => f.path)).not.toContain('llms-full.txt')
  })

  it('returns empty array when llmsTxt is explicitly false', () => {
    const files = generateLlmsTxt({ ...base, content: { llmsTxt: false } })
    expect(files).toHaveLength(0)
  })

  it('llms.txt starts with # site name', () => {
    const content = generateLlmsTxt(base)[0].content
    expect(content).toMatch(/^# My Site\n/)
  })

  it('llms.txt contains > description as blockquote', () => {
    const content = generateLlmsTxt(base)[0].content
    expect(content).toContain('> A great site')
  })

  it('includes links section when links are provided', () => {
    const config: AgentReadyConfig = {
      ...base,
      content: {
        links: [
          { title: 'Docs', url: 'https://example.com/docs', description: 'Documentation' },
          { title: 'API', url: 'https://example.com/api' },
        ],
      },
    }
    const content = generateLlmsTxt(config)[0].content
    expect(content).toContain('## Links')
    expect(content).toContain('- [Docs](https://example.com/docs): Documentation')
    expect(content).toContain('- [API](https://example.com/api)')
  })

  it('link without description has no trailing colon', () => {
    const config: AgentReadyConfig = {
      ...base,
      content: { links: [{ title: 'Home', url: 'https://example.com' }] },
    }
    const content = generateLlmsTxt(config)[0].content
    expect(content).toContain('- [Home](https://example.com)')
    expect(content).not.toContain('- [Home](https://example.com):')
  })

  it('returns llms-full.txt when llmsFullTxt is true', () => {
    const files = generateLlmsTxt({ ...base, content: { llmsFullTxt: true } })
    expect(files.map((f) => f.path)).toContain('llms-full.txt')
  })

  it('llms-full.txt has same content as llms.txt in phase 1', () => {
    const files = generateLlmsTxt({ ...base, content: { llmsFullTxt: true } })
    const llms = files.find((f) => f.path === 'llms.txt')!
    const full = files.find((f) => f.path === 'llms-full.txt')!
    expect(full.content).toBe(llms.content)
  })

  it('content ends with newline', () => {
    expect(generateLlmsTxt(base)[0].content.endsWith('\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../llms-txt'`

- [ ] **Step 3: Implement llms-txt.ts**

Create `packages/core/src/generators/llms-txt.ts`:

```ts
import type { AgentReadyConfig, GeneratedFile } from '../config'

export function generateLlmsTxt(config: AgentReadyConfig): GeneratedFile[] {
  const { site, content = {} } = config

  if (content.llmsTxt === false) return []

  const lines: string[] = [`# ${site.name}`, '', `> ${site.description}`]

  if (content.links?.length) {
    lines.push('', '## Links', '')
    for (const link of content.links) {
      const suffix = link.description ? `: ${link.description}` : ''
      lines.push(`- [${link.title}](${link.url})${suffix}`)
    }
  }

  const body = lines.join('\n') + '\n'
  const files: GeneratedFile[] = [{ path: 'llms.txt', content: body }]

  if (content.llmsFullTxt) {
    files.push({ path: 'llms-full.txt', content: body })
  }

  return files
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: all llms-txt tests PASS.

- [ ] **Step 5: Update index.ts**

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
export { generateRobots } from './generators/robots'
export { generateLlmsTxt } from './generators/llms-txt'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/generators/llms-txt.ts packages/core/src/generators/__tests__/llms-txt.test.ts packages/core/src/index.ts
git commit -m "feat(core): add generateLlmsTxt() with llmstxt.org spec"
```

---

### Task 7: sitemap.ts generator

**Files:**
- Create: `packages/core/src/generators/sitemap.ts`
- Create: `packages/core/src/generators/__tests__/sitemap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/sitemap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateSitemap } from '../sitemap'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test', baseUrl: 'https://example.com' },
}

describe('generateSitemap', () => {
  it('returns one file at sitemap.xml', () => {
    const files = generateSitemap(base, { date: '2026-06-04' })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('sitemap.xml')
  })

  it('starts with XML declaration', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
  })

  it('contains urlset namespace', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  })

  it('contains baseUrl as loc', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('<loc>https://example.com/</loc>')
  })

  it('uses provided date as lastmod', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('<lastmod>2026-06-04</lastmod>')
  })

  it('includes changefreq and priority', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('<changefreq>weekly</changefreq>')
    expect(content).toContain('<priority>1.0</priority>')
  })

  it('content ends with newline', () => {
    expect(generateSitemap(base, { date: '2026-06-04' })[0].content.endsWith('\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../sitemap'`

- [ ] **Step 3: Implement sitemap.ts**

Create `packages/core/src/generators/sitemap.ts`:

```ts
import type { AgentReadyConfig, GeneratedFile } from '../config'

export function generateSitemap(
  config: AgentReadyConfig,
  options: { date?: string } = {}
): GeneratedFile[] {
  const { site } = config
  const lastmod = options.date ?? new Date().toISOString().split('T')[0]

  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${site.baseUrl}/</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
  ].join('\n') + '\n'

  return [{ path: 'sitemap.xml', content }]
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: all sitemap tests PASS.

- [ ] **Step 5: Update index.ts**

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
export { generateRobots } from './generators/robots'
export { generateLlmsTxt } from './generators/llms-txt'
export { generateSitemap } from './generators/sitemap'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/generators/sitemap.ts packages/core/src/generators/__tests__/sitemap.test.ts packages/core/src/index.ts
git commit -m "feat(core): add generateSitemap() with deterministic date option"
```

---

### Task 8: mcp-server-card.ts generator

**Files:**
- Create: `packages/core/src/generators/mcp-server-card.ts`
- Create: `packages/core/src/generators/__tests__/mcp-server-card.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/mcp-server-card.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateMcpServerCard } from '../mcp-server-card'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'My Site', description: 'A great site', baseUrl: 'https://example.com' },
}

describe('generateMcpServerCard', () => {
  it('returns empty array when mcpServerCard is not set', () => {
    expect(generateMcpServerCard(base)).toHaveLength(0)
  })

  it('returns empty array when mcpServerCard is false', () => {
    expect(generateMcpServerCard({ ...base, protocol: { mcpServerCard: false } })).toHaveLength(0)
  })

  it('returns one file at .well-known/mcp/server-card.json when mcpServerCard is true', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('.well-known/mcp/server-card.json')
  })

  it('output is valid JSON', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  it('uses site.name and site.description as defaults', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    const card = JSON.parse(files[0].content)
    expect(card.name).toBe('My Site')
    expect(card.description).toBe('A great site')
  })

  it('uses site.baseUrl as url', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    const card = JSON.parse(files[0].content)
    expect(card.url).toBe('https://example.com')
  })

  it('defaults auth.type to none', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    const card = JSON.parse(files[0].content)
    expect(card.auth.type).toBe('none')
  })

  it('applies MCPServerCardOptions overrides', () => {
    const files = generateMcpServerCard({
      ...base,
      protocol: {
        mcpServerCard: {
          name: 'Custom Name',
          description: 'Custom desc',
          capabilities: ['tools', 'resources'],
          authType: 'oauth2',
        },
      },
    })
    const card = JSON.parse(files[0].content)
    expect(card.name).toBe('Custom Name')
    expect(card.description).toBe('Custom desc')
    expect(card.capabilities).toEqual(['tools', 'resources'])
    expect(card.auth.type).toBe('oauth2')
  })

  it('content ends with newline', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    expect(files[0].content.endsWith('\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../mcp-server-card'`

- [ ] **Step 3: Implement mcp-server-card.ts**

Create `packages/core/src/generators/mcp-server-card.ts`:

```ts
import type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions } from '../config'

export function generateMcpServerCard(config: AgentReadyConfig): GeneratedFile[] {
  const { site, protocol = {} } = config

  if (!protocol.mcpServerCard) return []

  const opts: MCPServerCardOptions =
    typeof protocol.mcpServerCard === 'object' ? protocol.mcpServerCard : {}

  const card = {
    name: opts.name ?? site.name,
    description: opts.description ?? site.description,
    url: site.baseUrl,
    version: '1.0.0',
    capabilities: opts.capabilities ?? [],
    auth: {
      type: opts.authType ?? 'none',
    },
  }

  return [
    {
      path: '.well-known/mcp/server-card.json',
      content: JSON.stringify(card, null, 2) + '\n',
    },
  ]
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: all mcp-server-card tests PASS.

- [ ] **Step 5: Update index.ts**

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
export { generateRobots } from './generators/robots'
export { generateLlmsTxt } from './generators/llms-txt'
export { generateSitemap } from './generators/sitemap'
export { generateMcpServerCard } from './generators/mcp-server-card'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/generators/mcp-server-card.ts packages/core/src/generators/__tests__/mcp-server-card.test.ts packages/core/src/index.ts
git commit -m "feat(core): add generateMcpServerCard() per MCP server-card draft"
```

---

### Task 9: agent-skills.ts generator

**Files:**
- Create: `packages/core/src/generators/agent-skills.ts`
- Create: `packages/core/src/generators/__tests__/agent-skills.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/agent-skills.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateAgentSkills } from '../agent-skills'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test', baseUrl: 'https://example.com' },
}

describe('generateAgentSkills', () => {
  it('returns empty array when agentSkills is not set', () => {
    expect(generateAgentSkills(base)).toHaveLength(0)
  })

  it('returns empty array when agentSkills is false', () => {
    expect(generateAgentSkills({ ...base, protocol: { agentSkills: false } })).toHaveLength(0)
  })

  it('returns one file at .well-known/agent-skills/index.json when agentSkills is true', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('.well-known/agent-skills/index.json')
  })

  it('output is valid JSON', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  it('output has version field set to "1"', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    const index = JSON.parse(files[0].content)
    expect(index.version).toBe('1')
  })

  it('output has skills array', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    const index = JSON.parse(files[0].content)
    expect(Array.isArray(index.skills)).toBe(true)
  })

  it('content ends with newline', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    expect(files[0].content.endsWith('\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../agent-skills'`

- [ ] **Step 3: Implement agent-skills.ts**

Create `packages/core/src/generators/agent-skills.ts`:

```ts
import type { AgentReadyConfig, GeneratedFile } from '../config'

export function generateAgentSkills(config: AgentReadyConfig): GeneratedFile[] {
  const { protocol = {} } = config

  if (!protocol.agentSkills) return []

  const index = {
    version: '1',
    skills: [] as unknown[],
  }

  return [
    {
      path: '.well-known/agent-skills/index.json',
      content: JSON.stringify(index, null, 2) + '\n',
    },
  ]
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: all agent-skills tests PASS.

- [ ] **Step 5: Update index.ts**

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
export { generateRobots } from './generators/robots'
export { generateLlmsTxt } from './generators/llms-txt'
export { generateSitemap } from './generators/sitemap'
export { generateMcpServerCard } from './generators/mcp-server-card'
export { generateAgentSkills } from './generators/agent-skills'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/generators/agent-skills.ts packages/core/src/generators/__tests__/agent-skills.test.ts packages/core/src/index.ts
git commit -m "feat(core): add generateAgentSkills() per Cloudflare agent-skills-discovery RFC"
```

---

### Task 10: api-catalog.ts generator

**Files:**
- Create: `packages/core/src/generators/api-catalog.ts`
- Create: `packages/core/src/generators/__tests__/api-catalog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/api-catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateApiCatalog } from '../api-catalog'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test', baseUrl: 'https://example.com' },
}

describe('generateApiCatalog', () => {
  it('returns empty array when apiCatalog is not set', () => {
    expect(generateApiCatalog(base)).toHaveLength(0)
  })

  it('returns empty array when apiCatalog is false', () => {
    expect(generateApiCatalog({ ...base, protocol: { apiCatalog: false } })).toHaveLength(0)
  })

  it('returns one file at .well-known/api-catalog when apiCatalog is true', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('.well-known/api-catalog')
  })

  it('output is valid JSON', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  it('output has apis array when apiCatalog is true with no options', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    const catalog = JSON.parse(files[0].content)
    expect(Array.isArray(catalog.apis)).toBe(true)
  })

  it('includes api entries from APICatalogOptions', () => {
    const files = generateApiCatalog({
      ...base,
      protocol: {
        apiCatalog: {
          apis: [
            { title: 'REST API', description: 'Main API', openapi: 'https://example.com/openapi.json' },
          ],
        },
      },
    })
    const catalog = JSON.parse(files[0].content)
    expect(catalog.apis).toHaveLength(1)
    expect(catalog.apis[0].title).toBe('REST API')
    expect(catalog.apis[0].description).toBe('Main API')
    expect(catalog.apis[0].openapi).toBe('https://example.com/openapi.json')
  })

  it('omits undefined optional fields from api entries', () => {
    const files = generateApiCatalog({
      ...base,
      protocol: { apiCatalog: { apis: [{ title: 'Minimal API' }] } },
    })
    const catalog = JSON.parse(files[0].content)
    expect(catalog.apis[0]).not.toHaveProperty('description')
    expect(catalog.apis[0]).not.toHaveProperty('openapi')
  })

  it('content ends with newline', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    expect(files[0].content.endsWith('\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../api-catalog'`

- [ ] **Step 3: Implement api-catalog.ts**

Create `packages/core/src/generators/api-catalog.ts`:

```ts
import type { AgentReadyConfig, APICatalogOptions, GeneratedFile } from '../config'

export function generateApiCatalog(config: AgentReadyConfig): GeneratedFile[] {
  const { protocol = {} } = config

  if (!protocol.apiCatalog) return []

  const opts: APICatalogOptions =
    typeof protocol.apiCatalog === 'object' ? protocol.apiCatalog : { apis: [] }

  const catalog = {
    apis: opts.apis.map((api) => ({
      title: api.title,
      ...(api.description !== undefined ? { description: api.description } : {}),
      ...(api.openapi !== undefined ? { openapi: api.openapi } : {}),
    })),
  }

  return [
    {
      path: '.well-known/api-catalog',
      content: JSON.stringify(catalog, null, 2) + '\n',
    },
  ]
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: all api-catalog tests PASS.

- [ ] **Step 5: Update index.ts**

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
export { generateRobots } from './generators/robots'
export { generateLlmsTxt } from './generators/llms-txt'
export { generateSitemap } from './generators/sitemap'
export { generateMcpServerCard } from './generators/mcp-server-card'
export { generateAgentSkills } from './generators/agent-skills'
export { generateApiCatalog } from './generators/api-catalog'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/generators/api-catalog.ts packages/core/src/generators/__tests__/api-catalog.test.ts packages/core/src/index.ts
git commit -m "feat(core): add generateApiCatalog() per RFC 9727"
```

---

### Task 11: generateAll() + final index.ts

**Files:**
- Create: `packages/core/src/generators/generate-all.ts`
- Create: `packages/core/src/generators/__tests__/generate-all.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/generators/__tests__/generate-all.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateAll } from '../generate-all'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test site', baseUrl: 'https://example.com' },
}

const full: AgentReadyConfig = {
  site: { name: 'Full Site', description: 'A full site', baseUrl: 'https://example.com' },
  content: { llmsTxt: true, llmsFullTxt: true, links: [{ title: 'Docs', url: 'https://example.com/docs' }] },
  bots: { aiTrain: false, aiInput: false, search: true },
  protocol: {
    mcpServerCard: true,
    agentSkills: true,
    apiCatalog: { apis: [{ title: 'API' }] },
  },
}

describe('generateAll', () => {
  it('always includes robots.txt and sitemap.xml', () => {
    const paths = generateAll(base, { date: '2026-06-04' }).map((f) => f.path)
    expect(paths).toContain('robots.txt')
    expect(paths).toContain('sitemap.xml')
  })

  it('always includes llms.txt by default', () => {
    const paths = generateAll(base, { date: '2026-06-04' }).map((f) => f.path)
    expect(paths).toContain('llms.txt')
  })

  it('returns all expected files for a full config', () => {
    const paths = generateAll(full, { date: '2026-06-04' }).map((f) => f.path)
    expect(paths).toContain('robots.txt')
    expect(paths).toContain('llms.txt')
    expect(paths).toContain('llms-full.txt')
    expect(paths).toContain('sitemap.xml')
    expect(paths).toContain('.well-known/mcp/server-card.json')
    expect(paths).toContain('.well-known/agent-skills/index.json')
    expect(paths).toContain('.well-known/api-catalog')
  })

  it('returns no duplicate paths', () => {
    const paths = generateAll(full, { date: '2026-06-04' }).map((f) => f.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('passes date option to sitemap generator', () => {
    const files = generateAll(base, { date: '2026-01-01' })
    const sitemap = files.find((f) => f.path === 'sitemap.xml')!
    expect(sitemap.content).toContain('<lastmod>2026-01-01</lastmod>')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/core && pnpm test
```
Expected: FAIL — `Cannot find module '../generate-all'`

- [ ] **Step 3: Implement generate-all.ts**

Create `packages/core/src/generators/generate-all.ts`:

```ts
import type { AgentReadyConfig, GeneratedFile } from '../config'
import { generateRobots } from './robots'
import { generateLlmsTxt } from './llms-txt'
import { generateSitemap } from './sitemap'
import { generateMcpServerCard } from './mcp-server-card'
import { generateAgentSkills } from './agent-skills'
import { generateApiCatalog } from './api-catalog'

export function generateAll(
  config: AgentReadyConfig,
  options: { date?: string } = {}
): GeneratedFile[] {
  return [
    ...generateRobots(config),
    ...generateLlmsTxt(config),
    ...generateSitemap(config, options),
    ...generateMcpServerCard(config),
    ...generateAgentSkills(config),
    ...generateApiCatalog(config),
  ]
}
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
cd packages/core && pnpm test
```
Expected: ALL tests across all files PASS. Count should be 40+ tests.

- [ ] **Step 5: Write final index.ts**

Replace `packages/core/src/index.ts` with the complete export list:

```ts
export type { AgentReadyConfig, GeneratedFile, MCPServerCardOptions, APICatalogOptions } from './config'
export { defineConfig } from './config'
export { validate, AgentReadyValidationError } from './validate'
export { generateAll } from './generators/generate-all'
export { generateRobots } from './generators/robots'
export { generateLlmsTxt } from './generators/llms-txt'
export { generateSitemap } from './generators/sitemap'
export { generateMcpServerCard } from './generators/mcp-server-card'
export { generateAgentSkills } from './generators/agent-skills'
export { generateApiCatalog } from './generators/api-catalog'
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
cd packages/core && pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/generators/generate-all.ts packages/core/src/generators/__tests__/generate-all.test.ts packages/core/src/index.ts
git commit -m "feat(core): add generateAll() and finalize public exports"
```

---

### Task 12: Build verification

**Goal:** Confirm tsup produces valid ESM+CJS+types output.

- [ ] **Step 1: Run the build**

```bash
cd packages/core && pnpm build
```
Expected output (tsup):
```
ESM dist/index.mjs  X.XXkb
CJS dist/index.cjs  X.XXkb
DTS dist/index.d.ts
```
No errors.

- [ ] **Step 2: Verify dist structure**

```bash
ls packages/core/dist/
```
Expected: `index.mjs`, `index.cjs`, `index.d.ts` (plus `.map` files).

- [ ] **Step 3: Smoke-test ESM output**

```bash
node --input-type=module <<'EOF'
import { defineConfig, generateAll } from './packages/core/dist/index.mjs'
const config = defineConfig({
  site: { name: 'Test', description: 'Test site', baseUrl: 'https://example.com' },
})
const files = generateAll(config, { date: '2026-06-04' })
console.log('Generated paths:', files.map(f => f.path))
EOF
```
Expected output:
```
Generated paths: [ 'robots.txt', 'llms.txt', 'sitemap.xml' ]
```

- [ ] **Step 4: Add dist to .gitignore**

Create `.gitignore`:
```
node_modules/
packages/*/dist/
*.tsbuildinfo
```

- [ ] **Step 5: Final commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore, verify build output"
```

- [ ] **Step 6: Run full test suite one last time**

```bash
pnpm test
```
Expected: all tests PASS, zero failures.
