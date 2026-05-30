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
    const donna = { name: 'Donna June Steighner', birthYear: '1940' }
    const bob = { name: 'Robert (Bob) Joseph Steighner', birthYear: '1949' }
    const anna = { name: 'Anna Marie Steighner', birthYear: '1949' }

    expect(comparePeopleByBirthThenName(donna, bob)).toBeLessThan(0)
    expect(comparePeopleByBirthThenName(bob, donna)).toBeGreaterThan(0)
    expect(comparePeopleByBirthThenName(anna, bob)).toBeLessThan(0)
  })
})
