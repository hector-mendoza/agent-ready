import { describe, it, expect } from 'vitest'
import { generateAgentSkills } from '../agent-skills'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test', baseUrl: 'https://example.com' },
}

describe('generateAgentSkills', () => {
  it('returns empty array when agentSkills is not set', () => {
    expect(generateAgentSkills(base)).toHaveLength(0)
  })

  it('returns empty array when agentSkills is false', () => {
    expect(generateAgentSkills({ ...base, protocol: { agentSkills: false } })).toHaveLength(0)
  })

  it('returns one file at .well-known/agent-skills/index.json when agentSkills is true', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('.well-known/agent-skills/index.json')
  })

  it('output is valid JSON', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  it('output has version field set to "1"', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    const index = JSON.parse(files[0].content)
    expect(index.version).toBe('1')
  })

  it('output has skills array', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    const index = JSON.parse(files[0].content)
    expect(Array.isArray(index.skills)).toBe(true)
  })

  it('content ends with newline', () => {
    const files = generateAgentSkills({ ...base, protocol: { agentSkills: true } })
    expect(files[0].content.endsWith('\n')).toBe(true)
  })
})
