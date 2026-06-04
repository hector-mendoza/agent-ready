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
