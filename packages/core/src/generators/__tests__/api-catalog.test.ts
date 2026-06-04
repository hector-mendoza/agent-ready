import { describe, it, expect } from 'vitest'
import { generateApiCatalog } from '../api-catalog'
import type { AgentReadyConfig } from '../../config'

const base: AgentReadyConfig = {
  site: { name: 'Test', description: 'Test', baseUrl: 'https://example.com' },
}

describe('generateApiCatalog', () => {
  it('returns empty array when apiCatalog is not set', () => {
    expect(generateApiCatalog(base)).toHaveLength(0)
  })

  it('returns empty array when apiCatalog is false', () => {
    expect(generateApiCatalog({ ...base, protocol: { apiCatalog: false } })).toHaveLength(0)
  })

  it('returns one file at .well-known/api-catalog when apiCatalog is true', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('.well-known/api-catalog')
  })

  it('output is valid JSON', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    expect(() => JSON.parse(files[0].content)).not.toThrow()
  })

  it('output has apis array when apiCatalog is true with no options', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    const catalog = JSON.parse(files[0].content)
    expect(Array.isArray(catalog.apis)).toBe(true)
  })

  it('includes api entries from APICatalogOptions', () => {
    const files = generateApiCatalog({
      ...base,
      protocol: {
        apiCatalog: {
          apis: [
            { title: 'REST API', description: 'Main API', openapi: 'https://example.com/openapi.json' },
          ],
        },
      },
    })
    const catalog = JSON.parse(files[0].content)
    expect(catalog.apis).toHaveLength(1)
    expect(catalog.apis[0].title).toBe('REST API')
    expect(catalog.apis[0].description).toBe('Main API')
    expect(catalog.apis[0].openapi).toBe('https://example.com/openapi.json')
  })

  it('omits undefined optional fields from api entries', () => {
    const files = generateApiCatalog({
      ...base,
      protocol: { apiCatalog: { apis: [{ title: 'Minimal API' }] } },
    })
    const catalog = JSON.parse(files[0].content)
    expect(catalog.apis[0]).not.toHaveProperty('description')
    expect(catalog.apis[0]).not.toHaveProperty('openapi')
  })

  it('content ends with newline', () => {
    const files = generateApiCatalog({ ...base, protocol: { apiCatalog: true } })
    expect(files[0].content.endsWith('\n')).toBe(true)
  })
})
