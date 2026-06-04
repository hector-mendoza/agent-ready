import type { AgentReadyConfig, GeneratedFile } from '../config'

export function generateLlmsTxt(config: AgentReadyConfig): GeneratedFile[] {
  const { site, content = {} } = config

  if (content.llmsTxt === false) return []

  const lines: string[] = [`# ${site.name}`, '', `> ${site.description}`]

  if (content.links?.length) {
    lines.push('', '## Links', '')
    for (const link of content.links) {
      const suffix = link.description ? `: ${link.description}` : ''
      lines.push(`- [${link.title}](${link.url})${suffix}`)
    }
  }

  const body = lines.join('\n') + '\n'
  const files: GeneratedFile[] = [{ path: 'llms.txt', content: body }]

  if (content.llmsFullTxt) {
    files.push({ path: 'llms-full.txt', content: body })
  }

  return files
}
