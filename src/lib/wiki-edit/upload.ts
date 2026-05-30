/** Upload a file to the wiki and return its public URL, or an error message. */
export async function uploadFileToWiki(file: File): Promise<{ url: string } | { error: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!response.ok) {
    const body = await response.json()
    return { error: body.error ?? body.message ?? 'Upload failed' }
  }

  const { url } = await response.json()
  return { url: url as string }
}

/** Build markdown for an uploaded file link or image. */
export function markdownForUpload(file: File, url: string): string {
  const isImage = file.type.startsWith('image/')
  return isImage ? `![${file.name}](${url})` : `[${file.name}](${url})`
}
