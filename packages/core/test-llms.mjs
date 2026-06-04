import { generateLlmsTxt } from './dist/index.js'

// Test 1: Basic content format
const config1 = {
  site: {
    name: 'Test Site',
    description: 'A test description',
    baseUrl: 'https://example.com'
  }
}

const result1 = generateLlmsTxt(config1)
console.log('Test 1 - Basic output:')
console.log('Path:', result1[0].path)
console.log('Content:')
console.log(result1[0].content)
console.log('Ends with newline:', result1[0].content.endsWith('\n'))
console.log('---')

// Test 2: With links and descriptions
const config2 = {
  site: {
    name: 'Test Site',
    description: 'A test description',
    baseUrl: 'https://example.com'
  },
  content: {
    links: [
      { title: 'Docs', url: 'https://example.com/docs', description: 'Documentation site' },
      { title: 'API', url: 'https://example.com/api' }
    ]
  }
}

const result2 = generateLlmsTxt(config2)
console.log('Test 2 - With links:')
console.log(result2[0].content)
console.log('---')

// Test 3: llmsFullTxt enabled
const config3 = {
  site: {
    name: 'Test Site',
    description: 'A test description',
    baseUrl: 'https://example.com'
  },
  content: {
    llmsFullTxt: true
  }
}

const result3 = generateLlmsTxt(config3)
console.log('Test 3 - With llmsFullTxt:')
console.log('Files count:', result3.length)
console.log('Paths:', result3.map(f => f.path))
console.log('Same content:', result3[0].content === result3[1].content)
console.log('---')

// Test 4: llmsTxt disabled
const config4 = {
  site: {
    name: 'Test Site',
    description: 'A test description',
    baseUrl: 'https://example.com'
  },
  content: {
    llmsTxt: false
  }
}

const result4 = generateLlmsTxt(config4)
console.log('Test 4 - llmsTxt disabled:')
console.log('Files returned:', result4.length)
