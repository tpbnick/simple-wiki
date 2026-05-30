import { describe, expect, it } from 'vitest'
import {
  decodeTemplateParamValue,
  encodeTemplateParamValue,
  parseTemplateBody,
  partsToParamRecord,
  splitTemplateParamString
} from '$lib/templates/param-string.js'

describe('template param encoding', () => {
  it('round-trips newlines, pipes, and backslashes', () => {
    const value = 'Latin:"Hello"\n\nTranslation:"A | B"\\note'
    expect(decodeTemplateParamValue(encodeTemplateParamValue(value))).toBe(value)
  })

  it('splits on unescaped pipes only', () => {
    const parts = splitTemplateParamString(
      'ImageBox|@id=x|@img0_cap=Hello\\|World|@order=@img0'
    )
    expect(parts).toHaveLength(4)
    expect(partsToParamRecord(parts)['@img0_cap']).toBe('Hello|World')
  })

  it('parses positional and named template params', () => {
    const parsed = parseTemplateBody('Infobox|title=Country|field=Value')
    expect(parsed.name).toBe('Infobox')
    expect(parsed.params.title).toBe('Country')
    expect(parsed.params.field).toBe('Value')
  })
})
