import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      $extensions: path.resolve(__dirname, 'extensions')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'extensions/**/*.test.ts']
  }
})
