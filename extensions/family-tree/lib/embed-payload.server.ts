/** Base64-encodes tree JSON for a safe <code>data-tree</code> attribute. */
export function encodeFamilyTreePayload(data: unknown): string {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64')
}

/** Decodes tree JSON from a base64 payload string (Node). */
export function decodeFamilyTreePayload(payload: string): unknown {
  const json = Buffer.from(payload, 'base64').toString('utf8')
  return JSON.parse(json)
}
