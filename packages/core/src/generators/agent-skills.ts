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
