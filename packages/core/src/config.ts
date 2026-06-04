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
