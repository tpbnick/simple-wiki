const EOCD_SIGNATURE = 0x06054b50
const CD_SIGNATURE = 0x02014b50
const EOCD_MIN_SIZE = 22

export interface ZipArchiveLimits {
  maxEntries: number
  maxTotalUncompressed: number
  maxEntryUncompressed: number
}

export class ZipSafetyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipSafetyError'
  }
}

function readUint16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8)
}

function readUint32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0
}

function findEndOfCentralDirectory(data: Uint8Array): number {
  const minOffset = Math.max(0, data.length - 65557)
  for (let offset = data.length - EOCD_MIN_SIZE; offset >= minOffset; offset--) {
    if (readUint32(data, offset) === EOCD_SIGNATURE) return offset
  }
  throw new ZipSafetyError('Could not find zip central directory')
}

/**
 * Validates zip metadata before decompression to mitigate zip bombs.
 */
export function validateZipArchiveLimits(data: Uint8Array, limits: ZipArchiveLimits): void {
  if (data.length < EOCD_MIN_SIZE) {
    throw new ZipSafetyError('Invalid zip archive')
  }

  const eocdOffset = findEndOfCentralDirectory(data)
  const entryCount = readUint16(data, eocdOffset + 10)
  const centralDirectorySize = readUint32(data, eocdOffset + 12)
  const centralDirectoryOffset = readUint32(data, eocdOffset + 16)

  if (entryCount > limits.maxEntries) {
    throw new ZipSafetyError(`Zip archive contains too many entries (${entryCount})`)
  }

  if (centralDirectoryOffset + centralDirectorySize > data.length) {
    throw new ZipSafetyError('Invalid zip central directory')
  }

  let totalUncompressed = 0
  let offset = centralDirectoryOffset

  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > data.length || readUint32(data, offset) !== CD_SIGNATURE) {
      throw new ZipSafetyError('Invalid zip central directory entry')
    }

    const uncompressedSize = readUint32(data, offset + 24)
    const fileNameLength = readUint16(data, offset + 28)
    const extraFieldLength = readUint16(data, offset + 30)
    const commentLength = readUint16(data, offset + 32)

    if (uncompressedSize > limits.maxEntryUncompressed) {
      throw new ZipSafetyError('Zip entry exceeds maximum uncompressed size')
    }

    totalUncompressed += uncompressedSize
    if (totalUncompressed > limits.maxTotalUncompressed) {
      throw new ZipSafetyError('Zip archive exceeds maximum uncompressed size')
    }

    offset += 46 + fileNameLength + extraFieldLength + commentLength
  }
}

/** Validates actual decompressed entry sizes after unzip (guards metadata mismatches). */
export function validateUnzippedEntrySizes(
  entries: Record<string, Uint8Array>,
  limits: ZipArchiveLimits
): void {
  const names = Object.keys(entries)
  if (names.length > limits.maxEntries) {
    throw new ZipSafetyError(`Zip archive contains too many entries (${names.length})`)
  }

  let totalUncompressed = 0
  for (const name of names) {
    const size = entries[name]?.byteLength ?? 0
    if (size > limits.maxEntryUncompressed) {
      throw new ZipSafetyError(`Zip entry "${name}" exceeds maximum uncompressed size`)
    }
    totalUncompressed += size
    if (totalUncompressed > limits.maxTotalUncompressed) {
      throw new ZipSafetyError('Zip archive exceeds maximum uncompressed size')
    }
  }
}
