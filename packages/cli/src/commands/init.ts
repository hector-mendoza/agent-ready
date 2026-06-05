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
