import { fileURLToPath } from 'node:url'
import { runInit } from './commands/init.js'
import { runAudit, printAuditResult, printAuditGroups } from './commands/audit.js'
import { runLiveAudit, printLiveAuditGroups } from './commands/live-audit.js'
import { info } from './output.js'

export function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = args[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next
      i++
    } else {
      flags[key] = true
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
      '       [--force]                    Overwrite existing files',
      '  audit --url <url>                 Validate generated agent-readiness files locally',
      '        [--name <name>]             Site name (default: "My Site")',
      '        [--description <desc>]      Site description (default: "A site")',
      '        [--live]                    Also fetch and check real endpoints',
      '',
      'Options:',
      '  --help, -h                        Show this help message',
      '  --version, -v                     Show version number',
      '',
      'Examples:',
      '  agent-ready init',
      '  agent-ready init --force',
      '  agent-ready audit --url https://example.com',
      '  agent-ready audit --url https://example.com --live',
      '  agent-ready audit --url https://example.com --name "My App" --description "A great app"',
    ].join('\n'),
  )
}

function printVersion(): void {
  console.log('0.1.0')
}

export async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2)

  switch (command) {
    case 'init': {
      const flags = parseFlags(rest)
      await runInit(process.cwd(), flags['force'] === true)
      break
    }

    case 'audit': {
      const flags = parseFlags(rest)
      const url = flags['url']
      if (!url || typeof url !== 'string') {
        console.error('Error: --url is required for audit')
        console.error('Usage: agent-ready audit --url <url>')
        process.exit(1)
      }
      const isLive = flags['live'] === true
      const name = typeof flags['name'] === 'string' ? flags['name'] : undefined
      const description = typeof flags['description'] === 'string' ? flags['description'] : undefined
      const localResult = await runAudit({ url, name, description })

      if (isLive) {
        info(`\nagent-ready audit — ${url}\n`)
        info('── Local format checks ──────────────────────────')
        printAuditGroups(localResult)
        info('── Live checks ──────────────────────────────────')
        const liveResult = await runLiveAudit(url)
        printLiveAuditGroups(liveResult)
        const totalPassed = localResult.passed + liveResult.passed
        const totalChecks = localResult.total + liveResult.total
        const allPassed = totalPassed === totalChecks
        info(`Score: ${totalPassed}/${totalChecks} checks passed ${allPassed ? '✅' : '❌'}`)
        if (!allPassed) process.exit(1)
      } else {
        printAuditResult(url, localResult)
        if (localResult.passed < localResult.total) process.exit(1)
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

// Only auto-run when executed as the CLI entry point (not imported in tests)
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
}
