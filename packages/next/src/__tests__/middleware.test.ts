import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { agentReadyMiddleware, AGENT_READY_MATCHER } from '../middleware'
import type { AgentReadyConfig } from '@agent-ready/core'

const config: AgentReadyConfig = {
  site: { name: 'Test Site', description: 'A test site', baseUrl: 'https://example.com' },
  content: { llmsTxt: true, llmsFullTxt: true },
  bots: { aiTrain: false, search: true },
  protocol: {
    mcpServerCard: true,
    agentSkills: true,
    apiCatalog: { apis: [{ title: 'REST API' }] },
  },
}

const middleware = agentReadyMiddleware(config)

function req(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

describe('agentReadyMiddleware', () => {
  describe('/robots.txt', () => {
    it('returns 200', () => {
      expect(middleware(req('/robots.txt')).status).toBe(200)
    })

    it('has Content-Type text/plain', () => {
      expect(middleware(req('/robots.txt')).headers.get('content-type')).toContain('text/plain')
    })

    it('content contains User-agent: *', async () => {
      const text = await middleware(req('/robots.txt')).text()
      expect(text).toContain('User-agent: *')
    })
  })

  describe('/llms.txt', () => {
    it('returns 200', () => {
      expect(middleware(req('/llms.txt')).status).toBe(200)
    })

    it('has Content-Type text/plain', () => {
      expect(middleware(req('/llms.txt')).headers.get('content-type')).toContain('text/plain')
    })

    it('content starts with # Test Site', async () => {
      const text = await middleware(req('/llms.txt')).text()
      expect(text).toMatch(/^# Test Site/)
    })
  })

  describe('/llms-full.txt', () => {
    it('returns 200 when llmsFullTxt: true', () => {
      expect(middleware(req('/llms-full.txt')).status).toBe(200)
    })
  })

  describe('/sitemap.xml', () => {
    it('returns 200', () => {
      expect(middleware(req('/sitemap.xml')).status).toBe(200)
    })

    it('has Content-Type application/xml', () => {
      expect(middleware(req('/sitemap.xml')).headers.get('content-type')).toContain('application/xml')
    })

    it('content contains XML declaration', async () => {
      const text = await middleware(req('/sitemap.xml')).text()
      expect(text).toMatch(/^<\?xml/)
    })
  })

  describe('/.well-known paths', () => {
    it('returns 200 for /.well-known/mcp/server-card.json', () => {
      expect(middleware(req('/.well-known/mcp/server-card.json')).status).toBe(200)
    })

    it('/.well-known/mcp/server-card.json has Content-Type application/json', () => {
      expect(
        middleware(req('/.well-known/mcp/server-card.json')).headers.get('content-type')
      ).toContain('application/json')
    })

    it('returns 200 for /.well-known/agent-skills/index.json', () => {
      expect(middleware(req('/.well-known/agent-skills/index.json')).status).toBe(200)
    })

    it('returns 200 for /.well-known/api-catalog', () => {
      expect(middleware(req('/.well-known/api-catalog')).status).toBe(200)
    })

    it('/.well-known/api-catalog has Content-Type application/json', () => {
      expect(
        middleware(req('/.well-known/api-catalog')).headers.get('content-type')
      ).toContain('application/json')
    })
  })

  describe('cache headers', () => {
    it('includes Cache-Control: public on matched paths', () => {
      const cc = middleware(req('/robots.txt')).headers.get('cache-control')
      expect(cc).toContain('public')
      expect(cc).toContain('max-age=3600')
    })
  })

  describe('unknown paths', () => {
    it('passes through /about — no Content-Type set', () => {
      const res = middleware(req('/about'))
      expect(res.headers.get('content-type')).toBeNull()
    })

    it('passes through /api/foo — no Content-Type set', () => {
      const res = middleware(req('/api/foo'))
      expect(res.headers.get('content-type')).toBeNull()
    })
  })

  describe('disabled generators', () => {
    it('passes through /.well-known/mcp/server-card.json when mcpServerCard not configured', () => {
      const limited = agentReadyMiddleware({
        site: { name: 'X', description: 'X', baseUrl: 'https://example.com' },
      })
      const res = limited(req('/.well-known/mcp/server-card.json'))
      expect(res.headers.get('content-type')).toBeNull()
    })

    it('passes through /llms-full.txt when llmsFullTxt not set', () => {
      const limited = agentReadyMiddleware({
        site: { name: 'X', description: 'X', baseUrl: 'https://example.com' },
      })
      const res = limited(req('/llms-full.txt'))
      expect(res.headers.get('content-type')).toBeNull()
    })

    it('passes through /llms.txt when llmsTxt: false', () => {
      const limited = agentReadyMiddleware({
        site: { name: 'X', description: 'X', baseUrl: 'https://example.com' },
        content: { llmsTxt: false },
      })
      const res = limited(req('/llms.txt'))
      expect(res.headers.get('content-type')).toBeNull()
    })
  })

  describe('AGENT_READY_MATCHER', () => {
    it('is an array', () => {
      expect(Array.isArray(AGENT_READY_MATCHER)).toBe(true)
    })

    it('contains /robots.txt', () => {
      expect(AGENT_READY_MATCHER).toContain('/robots.txt')
    })

    it('contains /llms.txt', () => {
      expect(AGENT_READY_MATCHER).toContain('/llms.txt')
    })

    it('contains /sitemap.xml', () => {
      expect(AGENT_READY_MATCHER).toContain('/sitemap.xml')
    })

    it('contains a /.well-known pattern', () => {
      expect(AGENT_READY_MATCHER.some((m) => m.includes('.well-known'))).toBe(true)
    })
  })
})
