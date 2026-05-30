/** Decodes tree JSON from a base64 payload string (browser). */
export function decodeFamilyTreePayloadInBrowser(payload: string): unknown {
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json)
}
