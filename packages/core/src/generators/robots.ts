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
      '# Content-Signal directives (for isitagentready.com scoring)',
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
