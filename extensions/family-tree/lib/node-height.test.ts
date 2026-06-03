import { describe, expect, it } from 'vitest'
import { countNameLines, estimateNodeHeight } from './node-height.js'
import { createPerson } from './model.js'
import { NODE_HEIGHT } from './types.js'

const LONG_EXAMPLE_NAME = 'Jane Lucille Example Longname Person'

describe('countNameLines', () => {
  it('returns one line for short names', () => {
    expect(countNameLines('John Smith')).toBe(1)
  })

  it('wraps long names across multiple lines', () => {
    expect(countNameLines(LONG_EXAMPLE_NAME)).toBeGreaterThan(1)
  })
})

describe('estimateNodeHeight', () => {
  it('uses the minimum card height for short names', () => {
    const person = createPerson('John Smith')
    expect(estimateNodeHeight(person)).toBe(NODE_HEIGHT)
  })

  it('grows taller for multi-line names and birth years', () => {
    const person = {
      ...createPerson(LONG_EXAMPLE_NAME),
      birthYear: '1907',
      deathYear: '1996'
    }
    expect(estimateNodeHeight(person)).toBeGreaterThan(NODE_HEIGHT)
  })
})
