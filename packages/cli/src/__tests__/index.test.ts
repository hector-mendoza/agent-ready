import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseFlags } from '../index'

// ─── parseFlags unit tests ────────────────────────────────────────────────────

describe('parseFlags', () => {
  it('parses a single string flag', () => {
    expect(parseFlags(['--url', 'https://example.com'])).toEqual({ url: 'https://example.com' })
  })

  it('parses multiple string flags', () => {
    expect(
      parseFlags(['--url', 'https://example.com', '--name', 'My App', '--description', 'A site']),
    ).toEqual({ url: 'https://example.com', name: 'My App', description: 'A site' })
  })

  it('parses a boolean flag (no value)', () => {
    expect(parseFlags(['--force'])).toEqual({ force: true })
  })

  it('parses mixed string and boolean flags', () => {
    expect(parseFlags(['--url', 'https://x.com', '--live'])).toEqual({
      url: 'https://x.com',
      live: true,
    })
  })

  it('skips args that do not start with --', () => {
    expect(parseFlags(['audit', '--force'])).toEqual({ force: true })
  })

  it('returns empty object for empty args', () => {
    expect(parseFlags([])).toEqual({})
  })

  it('treats trailing flag with no value as boolean true', () => {
    expect(parseFlags(['--url', 'https://x.com', '--live'])).toMatchObject({ live: true })
  })

  it('next arg starting with -- is treated as another flag, not a value', () => {
    expect(parseFlags(['--live', '--url', 'https://x.com'])).toEqual({
      live: true,
      url: 'https://x.com',
    })
  })
})

// ─── main() dispatch integration tests ───────────────────────────────────────

vi.mock('../commands/init', () => ({
  runInit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../commands/audit', () => ({
  runAudit: vi.fn().mockResolvedValue({ checks: [], passed: 3, total: 3 }),
  printAuditResult: vi.fn(),
  printAuditGroups: vi.fn(),
}))

vi.mock('../commands/live-audit', () => ({
  runLiveAudit: vi.fn().mockResolvedValue({ checks: [], passed: 3, total: 3 }),
  printLiveAuditGroups: vi.fn(),
}))

describe('main() dispatch', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>
  let originalArgv: string[]

  beforeEach(() => {
    vi.resetModules()
    originalArgv = process.argv
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code ?? 0})`)
    })
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.clearAllMocks()
    exitSpy.mockRestore()
  })

  it('calls runInit for "init" command', async () => {
    process.argv = ['node', 'index.mjs', 'init']
    const { main } = await import('../index')
    const { runInit } = await import('../commands/init')
    await main()
    expect(runInit).toHaveBeenCalled()
  })

  it('passes force=true to runInit when --force is set', async () => {
    process.argv = ['node', 'index.mjs', 'init', '--force']
    const { main } = await import('../index')
    const { runInit } = await import('../commands/init')
    await main()
    expect(runInit).toHaveBeenCalledWith(expect.any(String), true)
  })

  it('calls runAudit for "audit" command with --url', async () => {
    process.argv = ['node', 'index.mjs', 'audit', '--url', 'https://example.com']
    const { main } = await import('../index')
    const { runAudit } = await import('../commands/audit')
    await main()
    expect(runAudit).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com' }))
  })

  it('exits 1 when audit is called without --url', async () => {
    process.argv = ['node', 'index.mjs', 'audit']
    const { main } = await import('../index')
    await expect(main()).rejects.toThrow('process.exit(1)')
  })

  it('prints version for --version', async () => {
    process.argv = ['node', 'index.mjs', '--version']
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { main } = await import('../index')
    await main()
    expect(logSpy).toHaveBeenCalledWith('0.1.0')
    logSpy.mockRestore()
  })

  it('prints version for -v', async () => {
    process.argv = ['node', 'index.mjs', '-v']
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { main } = await import('../index')
    await main()
    expect(logSpy).toHaveBeenCalledWith('0.1.0')
    logSpy.mockRestore()
  })

  it('prints help for --help', async () => {
    process.argv = ['node', 'index.mjs', '--help']
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { main } = await import('../index')
    await main()
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('agent-ready'))
    logSpy.mockRestore()
  })

  it('exits 1 for unknown command', async () => {
    process.argv = ['node', 'index.mjs', 'unknown-command']
    const { main } = await import('../index')
    await expect(main()).rejects.toThrow('process.exit(1)')
  })

  it('exits 0 for no command (bare invocation)', async () => {
    process.argv = ['node', 'index.mjs']
    const { main } = await import('../index')
    await expect(main()).rejects.toThrow('process.exit(0)')
  })
})
