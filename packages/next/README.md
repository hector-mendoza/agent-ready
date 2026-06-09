# @is-agent-ready/next

Next.js App Router middleware that serves all agent-readiness files dynamically — no static files, no build step.

## Install

```bash
npm install @is-agent-ready/next @is-agent-ready/core
```

## Setup

**1. Create `agent-ready.config.ts`** in your project root:

```ts
import { defineConfig } from '@is-agent-ready/core'

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
import { withAgentReady, AGENT_READY_MATCHER } from '@is-agent-ready/next'
import agentConfig from './agent-ready.config'

export default withAgentReady(agentConfig)
export const config = { matcher: AGENT_READY_MATCHER }
```

## Composing with existing middleware

If you already have auth, i18n, or other middleware, pass it as the second argument:

```ts
import { withAgentReady, AGENT_READY_MATCHER } from '@is-agent-ready/next'
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
