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
