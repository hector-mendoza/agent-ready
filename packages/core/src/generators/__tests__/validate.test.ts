import { describe, it, expect } from 'vitest'
import { validate, AgentReadyValidationError } from '../../validate'
import type { AgentReadyConfig } from '../../config'

const valid: AgentReadyConfig = {
  site: {
    name: 'My Site',
    description: 'A test site',
    baseUrl: 'https://example.com',
  },
}

describe('validate', () => {
  it('passes for a valid config', () => {
    expect(() => validate(valid)).not.toThrow()
  })

  it('throws AgentReadyValidationError when site.name is empty', () => {
    expect(() =>
      validate({ site: { name: '', description: 'ok', baseUrl: 'https://example.com' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when site.description is empty', () => {
    expect(() =>
      validate({ site: { name: 'ok', description: '  ', baseUrl: 'https://example.com' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when site.baseUrl is not a valid URL', () => {
    expect(() =>
      validate({ site: { name: 'ok', description: 'ok', baseUrl: 'not-a-url' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when site.baseUrl has a trailing slash', () => {
    expect(() =>
      validate({ site: { name: 'ok', description: 'ok', baseUrl: 'https://example.com/' } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when apiCatalog options has empty apis array', () => {
    expect(() =>
      validate({ ...valid, protocol: { apiCatalog: { apis: [] } } })
    ).toThrow(AgentReadyValidationError)
  })

  it('throws when apiCatalog options has missing apis property', () => {
    expect(() =>
      validate({ ...valid, protocol: { apiCatalog: {} as any } })
    ).toThrow(AgentReadyValidationError)
  })

  it('error message lists all issues', () => {
    try {
      validate({ site: { name: '', description: '', baseUrl: '' } })
    } catch (e) {
      expect(e).toBeInstanceOf(AgentReadyValidationError)
      expect((e as AgentReadyValidationError).issues).toHaveLength(3)
    }
  })
})
