/** Base64-encodes tree JSON for a safe `data-tree` attribute (browser). */
export function encodeFamilyTreePayloadInBrowser(data: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

/** Decodes tree JSON from a base64 payload string (browser). */
export function decodeFamilyTreePayloadInBrowser(payload: string): unknown {
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json)
}
