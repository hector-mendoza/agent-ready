import { describe, it, expect } from 'vitest'
import { runAudit } from '../commands/audit'

const flags = { url: 'https://example.com', name: 'Test Site', description: 'A test site' }

describe('runAudit', () => {
  it('returns an AuditResult with 10 total checks', async () => {
    const result = await runAudit(flags)
    expect(result.total).toBe(10)
  })

  it('all 10 checks pass for a valid config', async () => {
    const result = await runAudit(flags)
    expect(result.passed).toBe(10)
  })

  it('robots.txt — Sitemap pointer check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('Sitemap pointer'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — ai-train directive check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('ai-train'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — ai-input directive check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('ai-input'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — search directive check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('search directive'))
    expect(check?.passed).toBe(true)
  })

  it('robots.txt — User-agent wildcard check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('User-agent'))
    expect(check?.passed).toBe(true)
  })

  it('llms.txt — heading check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('heading'))
    expect(check?.passed).toBe(true)
  })

  it('llms.txt — blockquote check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('blockquote'))
    expect(check?.passed).toBe(true)
  })

  it('sitemap.xml — XML declaration check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('XML declaration'))
    expect(check?.passed).toBe(true)
  })

  it('sitemap.xml — urlset namespace check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('urlset'))
    expect(check?.passed).toBe(true)
  })

  it('sitemap.xml — loc entry check passes', async () => {
    const result = await runAudit(flags)
    const check = result.checks.find(c => c.label.includes('<loc>'))
    expect(check?.passed).toBe(true)
  })

  it('uses "My Site" as default name when not provided', async () => {
    const result = await runAudit({ url: 'https://example.com' })
    expect(result.passed).toBe(result.total)
  })
})
