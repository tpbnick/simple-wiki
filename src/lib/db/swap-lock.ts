/** Thrown when code tries to open the database during a backup restore swap. */
export class DatabaseSwapInProgressError extends Error {
  constructor(message = 'Database restore in progress') {
    super(message)
    this.name = 'DatabaseSwapInProgressError'
  }
}

let swapInProgress = false

/** Returns true while a backup import is replacing the live database file. */
export function isDatabaseSwapInProgress(): boolean {
  return swapInProgress
}

/** Blocks database access during an import swap. */
export function assertDatabaseAvailable(): void {
  if (swapInProgress) throw new DatabaseSwapInProgressError()
}

/** Marks the start of a database file swap (only one import at a time). */
export function beginDatabaseImport(): void {
  if (swapInProgress) {
    throw new Error('Another backup import is already in progress')
  }
  swapInProgress = true
}

/** Marks the end of a database file swap. */
export function endDatabaseImport(): void {
  swapInProgress = false
}

/** Clears the swap flag. Intended for tests. */
export function resetDatabaseSwapLockForTests(): void {
  swapInProgress = false
}
