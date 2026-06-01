/** Thrown when code tries to open the database during a backup or restore. */
export class DatabaseSwapInProgressError extends Error {
  constructor(message = 'Database operation in progress') {
    super(message)
    this.name = 'DatabaseSwapInProgressError'
  }
}

let operationInProgress = false

/** Returns true while a backup export or import is in progress. */
export function isDatabaseOperationInProgress(): boolean {
  return operationInProgress
}

/** Alias used by request handlers during import swaps. */
export function isDatabaseSwapInProgress(): boolean {
  return operationInProgress
}

/** Blocks database access during a backup export or import. */
export function assertDatabaseAvailable(): void {
  if (operationInProgress) throw new DatabaseSwapInProgressError()
}

function beginOperation(kind: 'backup' | 'import'): void {
  if (operationInProgress) {
    throw new Error(
      kind === 'import'
        ? 'Another backup import is already in progress'
        : 'Another database operation is already in progress'
    )
  }
  operationInProgress = true
}

function endOperation(): void {
  operationInProgress = false
}

/** Marks the start of a backup export (mutually exclusive with import). */
export function beginDatabaseBackup(): void {
  beginOperation('backup')
}

/** Marks the end of a backup export. */
export function endDatabaseBackup(): void {
  endOperation()
}

/** Marks the start of a database file swap (only one operation at a time). */
export function beginDatabaseImport(): void {
  beginOperation('import')
}

/** Marks the end of a database file swap. */
export function endDatabaseImport(): void {
  endOperation()
}

/** Clears the operation flag. Intended for tests. */
export function resetDatabaseSwapLockForTests(): void {
  operationInProgress = false
}
