import { NextRequest, NextResponse } from 'next/server'
import { generateAll } from '@agent-ready/core'
import type { AgentReadyConfig } from '@agent-ready/core'

export const AGENT_READY_MATCHER = [
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  '/sitemap.xml',
  '/.well-known/:path*',
]

function getContentType(pathname: string): string {
  if (pathname.endsWith('.txt')) return 'text/plain; charset=utf-8'
  if (pathname.endsWith('.xml')) return 'application/xml; charset=utf-8'
  return 'application/json; charset=utf-8'
}

export function agentReadyMiddleware(config: AgentReadyConfig) {
  return function middleware(request: NextRequest): NextResponse {
    const pathname = request.nextUrl.pathname
    const today = new Date().toISOString().split('T')[0]
    const files = generateAll(config, { date: today })
    const file = files.find((f) => `/${f.path}` === pathname)

    if (!file) return NextResponse.next()

    return new NextResponse(file.content, {
      headers: {
        'Content-Type': getContentType(pathname),
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  }
}
