import { describe, it, expect } from 'vitest'
import { generateLlmsTxt } from '../llms-txt'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'My Site', description: 'A great site', baseUrl: 'https://example.com' },
}

describe('generateLlmsTxt', () => {
  it('returns llms.txt by default', () => {
    const files = generateLlmsTxt(base)
    expect(files.map((f) => f.path)).toContain('llms.txt')
  })

  it('does not return llms-full.txt unless llmsFullTxt is true', () => {
    const files = generateLlmsTxt(base)
    expect(files.map((f) => f.path)).not.toContain('llms-full.txt')
  })

  it('returns empty array when llmsTxt is explicitly false', () => {
    const files = generateLlmsTxt({ ...base, content: { llmsTxt: false } })
    expect(files).toHaveLength(0)
  })

  it('llms.txt starts with # site name', () => {
    const content = generateLlmsTxt(base)[0].content
    expect(content).toMatch(/^# My Site\n/)
  })

  it('llms.txt contains > description as blockquote', () => {
    const content = generateLlmsTxt(base)[0].content
    expect(content).toContain('> A great site')
  })

  it('includes links section when links are provided', () => {
    const config: AgentReadyConfig = {
      ...base,
      content: {
        links: [
          { title: 'Docs', url: 'https://example.com/docs', description: 'Documentation' },
          { title: 'API', url: 'https://example.com/api' },
        ],
      },
    }
    const content = generateLlmsTxt(config)[0].content
    expect(content).toContain('## Links')
    expect(content).toContain('- [Docs](https://example.com/docs): Documentation')
    expect(content).toContain('- [API](https://example.com/api)')
  })

  it('link without description has no trailing colon', () => {
    const config: AgentReadyConfig = {
      ...base,
      content: { links: [{ title: 'Home', url: 'https://example.com' }] },
    }
    const content = generateLlmsTxt(config)[0].content
    expect(content).toContain('- [Home](https://example.com)')
    expect(content).not.toContain('- [Home](https://example.com):')
  })

  it('returns llms-full.txt when llmsFullTxt is true', () => {
    const files = generateLlmsTxt({ ...base, content: { llmsFullTxt: true } })
    expect(files.map((f) => f.path)).toContain('llms-full.txt')
  })

  it('llms-full.txt has same content as llms.txt in phase 1', () => {
    const files = generateLlmsTxt({ ...base, content: { llmsFullTxt: true } })
    const llms = files.find((f) => f.path === 'llms.txt')!
    const full = files.find((f) => f.path === 'llms-full.txt')!
    expect(full.content).toBe(llms.content)
  })

  it('content ends with newline', () => {
    expect(generateLlmsTxt(base)[0].content.endsWith('\n')).toBe(true)
  })
})
