import { describe, it, expect } from 'vitest'
import { generateAll } from '../generate-all'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test site', baseUrl: 'https://example.com' },
}

const full: AgentReadyConfig = {
  site: { name: 'Full Site', description: 'A full site', baseUrl: 'https://example.com' },
  content: { llmsTxt: true, llmsFullTxt: true, links: [{ title: 'Docs', url: 'https://example.com/docs' }] },
  bots: { aiTrain: false, aiInput: false, search: true },
  protocol: {
    mcpServerCard: true,
    agentSkills: true,
    apiCatalog: { apis: [{ title: 'API' }] },
  },
}

describe('generateAll', () => {
  it('always includes robots.txt and sitemap.xml', () => {
    const paths = generateAll(base, { date: '2026-06-04' }).map((f) => f.path)
    expect(paths).toContain('robots.txt')
    expect(paths).toContain('sitemap.xml')
  })

  it('always includes llms.txt by default', () => {
    const paths = generateAll(base, { date: '2026-06-04' }).map((f) => f.path)
    expect(paths).toContain('llms.txt')
  })

  it('returns all expected files for a full config', () => {
    const paths = generateAll(full, { date: '2026-06-04' }).map((f) => f.path)
    expect(paths).toContain('robots.txt')
    expect(paths).toContain('llms.txt')
    expect(paths).toContain('llms-full.txt')
    expect(paths).toContain('sitemap.xml')
    expect(paths).toContain('.well-known/mcp/server-card.json')
    expect(paths).toContain('.well-known/agent-skills/index.json')
    expect(paths).toContain('.well-known/api-catalog')
  })

  it('returns no duplicate paths', () => {
    const paths = generateAll(full, { date: '2026-06-04' }).map((f) => f.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('passes date option to sitemap generator', () => {
    const files = generateAll(base, { date: '2026-01-01' })
    const sitemap = files.find((f) => f.path === 'sitemap.xml')!
    expect(sitemap.content).toContain('<lastmod>2026-01-01</lastmod>')
  })
})
