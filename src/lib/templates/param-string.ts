/** Escapes newlines, pipes, and backslashes in template parameter values. */
export function encodeTemplateParamValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\|/g, '\\|')
}

/** Restores values written with {@link encodeTemplateParamValue}. */
export function decodeTemplateParamValue(value: string): string {
  let result = ''
  for (let index = 0; index < value.length; index++) {
    const char = value[index]
    if (char !== '\\' || index + 1 >= value.length) {
      result += char
      continue
    }

    const next = value[++index]
    switch (next) {
      case 'n':
        result += '\n'
        break
      case 'r':
        result += '\r'
        break
      case '|':
        result += '|'
        break
      case '\\':
        result += '\\'
        break
      default:
        result += `\\${next}`
        break
    }
  }

  return result
}

/** Splits a template body on unescaped pipe characters. */
export function splitTemplateParamString(paramString: string): string[] {
  const parts: string[] = []
  let current = ''

  for (let index = 0; index < paramString.length; index++) {
    const char = paramString[index]
    if (char === '\\' && index + 1 < paramString.length) {
      current += char + paramString[++index]
      continue
    }

    if (char === '|') {
      if (current.trim()) parts.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

export function partsToParamRecord(parts: string[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const part of parts) {
    const equalsIndex = part.indexOf('=')
    if (equalsIndex <= 0) continue
    const key = part.slice(0, equalsIndex).trim()
    const value = decodeTemplateParamValue(part.slice(equalsIndex + 1).trim())
    record[key] = value
  }
  return record
}

export interface ParsedTemplateBody {
  name: string
  params: Record<string, string>
}

/**
 * Parses a template invocation body (inside `{{…}}`) into name and params.
 * Positional segments become numeric keys (`"1"`, `"2"`, …) like wiki template syntax.
 */
export function parseTemplateBody(raw: string): ParsedTemplateBody {
  const parts = splitTemplateParamString(raw)
  const name = parts[0] ?? ''
  const params: Record<string, string> = {}
  let positionalIndex = 1

  for (let index = 1; index < parts.length; index++) {
    const equalsIndex = parts[index].indexOf('=')
    if (equalsIndex > -1) {
      const key = parts[index].slice(0, equalsIndex).trim()
      const value = decodeTemplateParamValue(parts[index].slice(equalsIndex + 1).trim())
      params[key] = value
    } else {
      params[String(positionalIndex++)] = decodeTemplateParamValue(parts[index])
    }
  }

  return { name, params }
}
