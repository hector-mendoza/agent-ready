import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInit } from '../commands/init'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'agent-ready-test-'))
}

describe('runInit', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true })
    dirs.length = 0
  })

  it('creates agent-ready.config.ts in the given directory', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    expect(existsSync(join(dir, 'agent-ready.config.ts'))).toBe(true)
  })

  it('agent-ready.config.ts contains defineConfig import', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'agent-ready.config.ts'), 'utf-8')
    expect(content).toContain("from '@is-agent-ready/core'")
    expect(content).toContain('defineConfig')
  })

  it('agent-ready.config.ts contains site.name and site.baseUrl fields', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'agent-ready.config.ts'), 'utf-8')
    expect(content).toContain('name:')
    expect(content).toContain('baseUrl:')
  })

  it('creates middleware.ts in the given directory', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    expect(existsSync(join(dir, 'middleware.ts'))).toBe(true)
  })

  it('middleware.ts imports withAgentReady and AGENT_READY_MATCHER', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'middleware.ts'), 'utf-8')
    expect(content).toContain('withAgentReady')
    expect(content).toContain('AGENT_READY_MATCHER')
  })

  it('does NOT overwrite existing agent-ready.config.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const configPath = join(dir, 'agent-ready.config.ts')
    writeFileSync(configPath, 'existing content', 'utf-8')
    await runInit(dir)
    expect(readFileSync(configPath, 'utf-8')).toBe('existing content')
  })

  it('does NOT overwrite existing middleware.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const mwPath = join(dir, 'middleware.ts')
    writeFileSync(mwPath, 'existing middleware', 'utf-8')
    await runInit(dir)
    expect(readFileSync(mwPath, 'utf-8')).toBe('existing middleware')
  })

  it('--force overwrites existing agent-ready.config.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const configPath = join(dir, 'agent-ready.config.ts')
    writeFileSync(configPath, 'existing content', 'utf-8')
    await runInit(dir, true)
    const content = readFileSync(configPath, 'utf-8')
    expect(content).not.toBe('existing content')
    expect(content).toContain('defineConfig')
  })

  it('--force overwrites existing middleware.ts', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    const mwPath = join(dir, 'middleware.ts')
    writeFileSync(mwPath, 'existing middleware', 'utf-8')
    await runInit(dir, true)
    const content = readFileSync(mwPath, 'utf-8')
    expect(content).not.toBe('existing middleware')
    expect(content).toContain('withAgentReady')
  })

  it('generated middleware.ts uses withAgentReady', async () => {
    const dir = makeTmpDir(); dirs.push(dir)
    await runInit(dir)
    const content = readFileSync(join(dir, 'middleware.ts'), 'utf-8')
    expect(content).toContain('withAgentReady')
    expect(content).not.toContain('agentReadyMiddleware(agentConfig)')
  })
})
