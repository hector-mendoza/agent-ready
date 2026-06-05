import { generateRobots, generateLlmsTxt, generateSitemap } from '@agent-ready/core'
import type { AgentReadyConfig } from '@agent-ready/core'
import { pass, fail, info } from '../output'

export interface CheckResult {
  label: string
  passed: boolean
}

export interface AuditResult {
  checks: CheckResult[]
  passed: number
  total: number
}

function check(label: string, condition: boolean): CheckResult {
  return { label, passed: condition }
}

export async function runAudit(flags: {
  url: string
  name?: string
  description?: string
}): Promise<AuditResult> {
  const config: AgentReadyConfig = {
    site: {
      name: flags.name ?? 'My Site',
      description: flags.description ?? 'A site',
      baseUrl: flags.url,
    },
    bots: { aiTrain: false, aiInput: false, search: true },
    content: { llmsTxt: true },
  }

  const robotsContent = generateRobots(config)[0]?.content ?? ''
  const llmsContent = generateLlmsTxt(config).find((f) => f.path === 'llms.txt')?.content ?? ''
  const sitemapContent = generateSitemap(config, { date: '2026-01-01' })[0]?.content ?? ''

  const checks: CheckResult[] = [
    check('robots.txt — Sitemap pointer present', robotsContent.includes('Sitemap:')),
    check('robots.txt — Content-Signal: ai-train directive present', robotsContent.includes('Content-Signal: ai-train=')),
    check('robots.txt — Content-Signal: ai-input directive present', robotsContent.includes('Content-Signal: ai-input=')),
    check('robots.txt — Content-Signal: search directive present', robotsContent.includes('Content-Signal: search=')),
    check('robots.txt — General User-agent: * block present', robotsContent.includes('User-agent: *')),
    check('llms.txt — Starts with # heading', /^# .+/m.test(llmsContent)),
    check('llms.txt — Has > blockquote description', llmsContent.includes('> ')),
    check('sitemap.xml — Valid XML declaration', /^<\?xml/.test(sitemapContent)),
    check('sitemap.xml — Has <urlset> namespace', sitemapContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')),
    check('sitemap.xml — Has <loc> entry', sitemapContent.includes('<loc>')),
  ]

  const passed = checks.filter((c) => c.passed).length
  return { checks, passed, total: checks.length }
}

export function printAuditGroups(result: AuditResult): void {
  const groups = [
    { name: 'robots.txt', checks: result.checks.slice(0, 5) },
    { name: 'llms.txt', checks: result.checks.slice(5, 7) },
    { name: 'sitemap.xml', checks: result.checks.slice(7, 10) },
  ]

  for (const group of groups) {
    info(group.name)
    for (const c of group.checks) {
      const label = c.label.split(' — ')[1] ?? c.label
      if (c.passed) pass(label)
      else fail(label)
    }
    info('')
  }
}

export function printAuditResult(url: string, result: AuditResult): void {
  info(`\nagent-ready audit — ${url}\n`)
  printAuditGroups(result)
  const allPassed = result.passed === result.total
  info(`Score: ${result.passed}/${result.total} checks passed ${allPassed ? '✅' : '❌'}`)
}
