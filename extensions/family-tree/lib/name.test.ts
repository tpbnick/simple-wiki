import { describe, expect, it } from 'vitest'
import { personDisplayName, comparePeopleByBirthThenName, parseBirthYear } from './name.js'

describe('personDisplayName', () => {
  it('extracts the label from wiki link syntax', () => {
    expect(personDisplayName('[[John Smith]]')).toBe('John Smith')
    expect(personDisplayName('[[John Smith|Johnny]]')).toBe('Johnny')
  })

  it('returns plain names unchanged', () => {
    expect(personDisplayName('John Smith')).toBe('John Smith')
  })
})

describe('parseBirthYear', () => {
  it('extracts numeric years from common formats', () => {
    expect(parseBirthYear('1940')).toBe(1940)
    expect(parseBirthYear('1949?')).toBe(1949)
  })
})

describe('comparePeopleByBirthThenName', () => {
  it('sorts by birth year then first name', () => {
    const jane1940 = { name: 'Jane Doe', birthYear: '1940' }
    const john1949 = { name: 'John (Jack) Doe', birthYear: '1949' }
    const janeMarie1949 = { name: 'Jane Marie Doe', birthYear: '1949' }

    expect(comparePeopleByBirthThenName(jane1940, john1949)).toBeLessThan(0)
    expect(comparePeopleByBirthThenName(john1949, jane1940)).toBeGreaterThan(0)
    expect(comparePeopleByBirthThenName(janeMarie1949, john1949)).toBeLessThan(0)
  })
})
