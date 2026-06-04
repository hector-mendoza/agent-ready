import type { AgentReadyConfig, GeneratedFile } from '../config'

export function generateSitemap(
  config: AgentReadyConfig,
  options: { date?: string } = {}
): GeneratedFile[] {
  const { site } = config
  const lastmod = options.date ?? new Date().toISOString().split('T')[0]

  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${site.baseUrl}/</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
  ].join('\n') + '\n'

  return [{ path: 'sitemap.xml', content }]
}
