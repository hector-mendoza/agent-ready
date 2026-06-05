import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runLiveAudit } from '../commands/live-audit'

const BASE_URL = 'https://example.com'

function makeFetch(responses: Record<string, { status: number; contentType: string; body: string }>) {
  return vi.fn().mockImplementation((url: string) => {
    const path = url.replace(BASE_URL, '')
    const r = responses[path]
    if (!r) return Promise.reject(new Error(`ECONNREFUSED — no mock for ${path}`))
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: { get: (h: string) => (h === 'content-type' ? r.contentType : null) },
      text: () => Promise.resolve(r.body),
    })
  })
}

const happyResponses = {
  '/robots.txt': {
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    body: 'User-agent: *\nContent-Signal: ai-train=false\nContent-Signal: ai-input=false\nContent-Signal: search=true\nSitemap: https://example.com/sitemap.xml',
  },
  '/llms.txt': {
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    body: '# My Site\n\n> A great site',
  },
  '/sitemap.xml': {
    status: 200,
    contentType: 'application/xml; charset=utf-8',
    body: '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com</loc></url></urlset>',
  },
  '/.well-known/mcp/server-card.json': {
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: '{"name":"My Site"}',
  },
}

describe('runLiveAudit', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('all checks pass (happy path)', () => {
    beforeEach(() => {
      globalThis.fetch = makeFetch(happyResponses) as unknown as typeof fetch
    })

    it('returns 10 checks', async () => {
      const result = await runLiveAudit(BASE_URL)
      expect(result.total).toBe(10)
    })

    it('all 10 checks pass', async () => {
      const result = await runLiveAudit(BASE_URL)
      expect(result.passed).toBe(10)
    })

    it('returns passed === total', async () => {
      const result = await runLiveAudit(BASE_URL)
      expect(result.passed).toBe(result.total)
    })
  })

  describe('robots.txt checks', () => {
    it('fails HTTP status check when robots.txt returns 404', async () => {
      globalThis.fetch = makeFetch({
        ...happyResponses,
        '/robots.txt': { status: 404, contentType: 'text/plain', body: '' },
      }) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      const statusCheck = result.checks.find((c) => c.label.includes('robots.txt') && c.label.includes('HTTP 200'))
      expect(statusCheck?.passed).toBe(false)
    })

    it('fails Content-Signal check when body is missing it', async () => {
      globalThis.fetch = makeFetch({
        ...happyResponses,
        '/robots.txt': { status: 200, contentType: 'text/plain', body: 'User-agent: *' },
      }) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      const check = result.checks.find((c) => c.label.includes('Content-Signal'))
      expect(check?.passed).toBe(false)
    })
  })

  describe('network errors', () => {
    it('marks checks as failed when endpoint is unreachable', async () => {
      globalThis.fetch = makeFetch({}) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      expect(result.passed).toBe(0)
      expect(result.total).toBe(10)
    })

    it('does not throw — errors are captured as failed checks', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch
      await expect(runLiveAudit(BASE_URL)).resolves.not.toThrow()
    })

    it('includes error message in label when endpoint throws', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      const robotsStatusCheck = result.checks[0]
      expect(robotsStatusCheck.label).toContain('ECONNREFUSED')
    })
  })

  describe('return shape', () => {
    it('each check has label and passed fields', async () => {
      globalThis.fetch = makeFetch(happyResponses) as unknown as typeof fetch
      const result = await runLiveAudit(BASE_URL)
      for (const check of result.checks) {
        expect(check).toHaveProperty('label')
        expect(check).toHaveProperty('passed')
        expect(typeof check.label).toBe('string')
        expect(typeof check.passed).toBe('boolean')
      }
    })
  })
})
