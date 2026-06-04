import { describe, it, expect } from 'vitest'
import { generateSitemap } from '../sitemap'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test', baseUrl: 'https://example.com' },
}

describe('generateSitemap', () => {
  it('returns one file at sitemap.xml', () => {
    const files = generateSitemap(base, { date: '2026-06-04' })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('sitemap.xml')
  })

  it('starts with XML declaration', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
  })

  it('contains urlset namespace', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  })

  it('contains baseUrl as loc', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('<loc>https://example.com/</loc>')
  })

  it('uses provided date as lastmod', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('<lastmod>2026-06-04</lastmod>')
  })

  it('includes changefreq and priority', () => {
    const content = generateSitemap(base, { date: '2026-06-04' })[0].content
    expect(content).toContain('<changefreq>weekly</changefreq>')
    expect(content).toContain('<priority>1.0</priority>')
  })

  it('content ends with newline', () => {
    expect(generateSitemap(base, { date: '2026-06-04' })[0].content.endsWith('\n')).toBe(true)
  })
})
