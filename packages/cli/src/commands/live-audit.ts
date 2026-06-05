import { pass, fail, info } from '../output'

export interface LiveCheckResult {
  label: string
  passed: boolean
}

export interface LiveAuditResult {
  checks: LiveCheckResult[]
  passed: number
  total: number
}

function liveCheck(label: string, condition: boolean): LiveCheckResult {
  return { label, passed: condition }
}

interface FetchedEndpoint {
  status: number
  contentType: string
  body: string
  error?: string
}

async function fetchEndpoint(url: string): Promise<FetchedEndpoint> {
  try {
    const res = await fetch(url)
    const body = await res.text()
    return {
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      body,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: 0, contentType: '', body: '', error: message }
  }
}

export async function runLiveAudit(baseUrl: string): Promise<LiveAuditResult> {
  const url = baseUrl.replace(/\/$/, '')

  const [robots, llms, sitemap, mcpCard] = await Promise.all([
    fetchEndpoint(`${url}/robots.txt`),
    fetchEndpoint(`${url}/llms.txt`),
    fetchEndpoint(`${url}/sitemap.xml`),
    fetchEndpoint(`${url}/.well-known/mcp/server-card.json`),
  ])

  const statusLabel = (path: string, endpoint: FetchedEndpoint) =>
    endpoint.error
      ? `${path} — Returns HTTP 200 (${endpoint.error})`
      : `${path} — Returns HTTP 200`

  const checks: LiveCheckResult[] = [
    // /robots.txt — 3 checks
    liveCheck(statusLabel('/robots.txt', robots), robots.status === 200),
    liveCheck('/robots.txt — Content-Type: text/plain', robots.contentType.includes('text/plain')),
    liveCheck('/robots.txt — Content-Signal directive present', robots.body.includes('Content-Signal:')),

    // /llms.txt — 2 checks
    liveCheck(statusLabel('/llms.txt', llms), llms.status === 200),
    liveCheck('/llms.txt — Starts with # heading', /^# .+/m.test(llms.body)),

    // /sitemap.xml — 3 checks
    liveCheck(statusLabel('/sitemap.xml', sitemap), sitemap.status === 200),
    liveCheck('/sitemap.xml — Content-Type: application/xml', sitemap.contentType.includes('application/xml')),
    liveCheck('/sitemap.xml — Has <urlset> element', sitemap.body.includes('<urlset')),

    // /.well-known/mcp/server-card.json — 2 checks
    liveCheck(statusLabel('/.well-known/mcp/server-card.json', mcpCard), mcpCard.status === 200),
    liveCheck('/.well-known/mcp/server-card.json — Content-Type: application/json', mcpCard.contentType.includes('application/json')),
  ]

  const passed = checks.filter((c) => c.passed).length
  return { checks, passed, total: checks.length }
}

export function printLiveAuditGroups(result: LiveAuditResult): void {
  const groups = [
    { name: '/robots.txt', checks: result.checks.slice(0, 3) },
    { name: '/llms.txt', checks: result.checks.slice(3, 5) },
    { name: '/sitemap.xml', checks: result.checks.slice(5, 8) },
    { name: '/.well-known/mcp/server-card.json', checks: result.checks.slice(8, 10) },
  ]

  for (const group of groups) {
    info(group.name)
    for (const c of group.checks) {
      const label = c.label.split(' — ').slice(1).join(' — ') || c.label
      if (c.passed) pass(label)
      else fail(label)
    }
    info('')
  }
}
