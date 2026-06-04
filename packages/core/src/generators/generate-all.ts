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
