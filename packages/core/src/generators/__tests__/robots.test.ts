import { describe, it, expect } from 'vitest'
import { generateRobots } from '../robots'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test site', baseUrl: 'https://example.com' },
}

describe('generateRobots', () => {
  it('returns one file at robots.txt', () => {
    const files = generateRobots(base)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('robots.txt')
  })

  it('includes Sitemap pointer with baseUrl', () => {
    const content = generateRobots(base)[0].content
    expect(content).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('emits Content-Signal deny for ai-train when aiTrain is false', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: false } })[0].content
    expect(content).toContain('Content-Signal: ai-train=deny')
  })

  it('emits Content-Signal allow for ai-train when aiTrain is true', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: true } })[0].content
    expect(content).toContain('Content-Signal: ai-train=allow')
  })

  it('emits Content-Signal deny for ai-input when aiInput is false', () => {
    const content = generateRobots({ ...base, bots: { aiInput: false } })[0].content
    expect(content).toContain('Content-Signal: ai-input=deny')
  })

  it('emits Content-Signal allow for ai-input when aiInput is true', () => {
    const content = generateRobots({ ...base, bots: { aiInput: true } })[0].content
    expect(content).toContain('Content-Signal: ai-input=allow')
  })

  it('defaults search to allow when bots.search is not set', () => {
    const content = generateRobots(base)[0].content
    expect(content).toContain('Content-Signal: search=allow')
  })

  it('emits Content-Signal deny for search when search is false', () => {
    const content = generateRobots({ ...base, bots: { search: false } })[0].content
    expect(content).toContain('Content-Signal: search=deny')
  })

  it('blocks known AI training bots when aiTrain is false', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: false } })[0].content
    expect(content).toContain('User-agent: GPTBot')
    expect(content).toContain('User-agent: CCBot')
    expect(content).toContain('User-agent: Google-Extended')
    // The Disallow must appear AFTER the User-agent block
    const gpgIdx = content.indexOf('User-agent: GPTBot')
    const disallowIdx = content.indexOf('Disallow: /', gpgIdx)
    expect(disallowIdx).toBeGreaterThan(gpgIdx)
  })

  it('allows known AI training bots when aiTrain is true', () => {
    const content = generateRobots({ ...base, bots: { aiTrain: true } })[0].content
    expect(content).toContain('User-agent: GPTBot')
    const gpgIdx = content.indexOf('User-agent: GPTBot')
    const allowIdx = content.indexOf('Allow: /', gpgIdx)
    expect(allowIdx).toBeGreaterThan(gpgIdx)
  })

  it('blocks known AI input bots when aiInput is false', () => {
    const content = generateRobots({ ...base, bots: { aiInput: false } })[0].content
    expect(content).toContain('User-agent: ClaudeBot')
    expect(content).toContain('User-agent: anthropic-ai')
    expect(content).toContain('User-agent: Bytespider')
  })

  it('appends custom blockedBots with Disallow: /', () => {
    const content = generateRobots({ ...base, bots: { blockedBots: ['BadBot', 'EvilCrawler'] } })[0].content
    expect(content).toContain('User-agent: BadBot')
    expect(content).toContain('User-agent: EvilCrawler')
    const badIdx = content.indexOf('User-agent: BadBot')
    const disIdx = content.indexOf('Disallow: /', badIdx)
    expect(disIdx).toBeGreaterThan(badIdx)
  })

  it('appends custom allowedBots with Allow: /', () => {
    const content = generateRobots({ ...base, bots: { allowedBots: ['FriendlyBot'] } })[0].content
    expect(content).toContain('User-agent: FriendlyBot')
    const idx = content.indexOf('User-agent: FriendlyBot')
    const allowIdx = content.indexOf('Allow: /', idx)
    expect(allowIdx).toBeGreaterThan(idx)
  })

  it('ends with a general User-agent: * Allow: / block', () => {
    const content = generateRobots(base)[0].content
    expect(content).toContain('User-agent: *\nAllow: /')
  })

  it('content ends with newline', () => {
    expect(generateRobots(base)[0].content.endsWith('\n')).toBe(true)
  })
})
