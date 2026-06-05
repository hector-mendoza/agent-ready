import { runInit } from './commands/init.js'
import { runAudit, printAuditResult } from './commands/audit.js'

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg.startsWith('--') && next !== undefined && !next.startsWith('--')) {
      flags[arg.slice(2)] = next
      i++
    }
  }
  return flags
}

function printHelp(): void {
  console.log(
    [
      'agent-ready — AI Agent Readiness CLI',
      '',
      'Commands:',
      '  init                              Scaffold agent-ready.config.ts and middleware.ts',
      '  audit --url <url>                 Validate generated agent-readiness files locally',
      '        [--name <name>]             Site name (default: "My Site")',
      '        [--description <desc>]      Site description (default: "A site")',
      '',
      'Options:',
      '  --help, -h                        Show this help message',
      '  --version, -v                     Show version number',
      '',
      'Examples:',
      '  agent-ready init',
      '  agent-ready audit --url https://example.com',
      '  agent-ready audit --url https://example.com --name "My App" --description "A great app"',
    ].join('\n'),
  )
}

function printVersion(): void {
  console.log('0.1.0')
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2)

  switch (command) {
    case 'init':
      await runInit()
      break

    case 'audit': {
      const flags = parseFlags(rest)
      if (!flags['url']) {
        console.error('Error: --url is required for audit')
        console.error('Usage: agent-ready audit --url <url>')
        process.exit(1)
      }
      const result = await runAudit(
        flags as { url: string; name?: string; description?: string },
      )
      printAuditResult(flags['url'], result)
      if (result.passed < result.total) {
        process.exit(1)
      }
      break
    }

    case '--help':
    case '-h':
    case 'help':
      printHelp()
      break

    case '--version':
    case '-v':
      printVersion()
      break

    default:
      printHelp()
      process.exit(command ? 1 : 0)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
