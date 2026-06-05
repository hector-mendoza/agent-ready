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
