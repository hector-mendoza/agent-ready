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
