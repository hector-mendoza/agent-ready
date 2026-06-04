import { describe, it, expect } from 'vitest'
import { generateMcpServerCard } from '../mcp-server-card'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'My Site', description: 'A great site', baseUrl: 'https://example.com' },
}

describe('generateMcpServerCard', () => {
  it('returns empty array when mcpServerCard is not set', () => {
    expect(generateMcpServerCard(base)).toHaveLength(0)
  })

  it('returns empty array when mcpServerCard is false', () => {
    expect(generateMcpServerCard({ ...base, protocol: { mcpServerCard: false } })).toHaveLength(0)
  })

  it('returns one file at .well-known/mcp/server-card.json when mcpServerCard is true', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('.well-known/mcp/server-card.json')
  })

  it('output is valid JSON', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  it('uses site.name and site.description as defaults', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    const card = JSON.parse(files[0].content)
    expect(card.name).toBe('My Site')
    expect(card.description).toBe('A great site')
  })

  it('uses site.baseUrl as url', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    const card = JSON.parse(files[0].content)
    expect(card.url).toBe('https://example.com')
  })

  it('defaults auth.type to none', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    const card = JSON.parse(files[0].content)
    expect(card.auth.type).toBe('none')
  })

  it('applies MCPServerCardOptions overrides', () => {
    const files = generateMcpServerCard({
      ...base,
      protocol: {
        mcpServerCard: {
          name: 'Custom Name',
          description: 'Custom desc',
          capabilities: ['tools', 'resources'],
          authType: 'oauth2',
        },
      },
    })
    const card = JSON.parse(files[0].content)
    expect(card.name).toBe('Custom Name')
    expect(card.description).toBe('Custom desc')
    expect(card.capabilities).toEqual(['tools', 'resources'])
    expect(card.auth.type).toBe('oauth2')
  })

  it('content ends with newline', () => {
    const files = generateMcpServerCard({ ...base, protocol: { mcpServerCard: true } })
    expect(files[0].content.endsWith('\n')).toBe(true)
  })
})
