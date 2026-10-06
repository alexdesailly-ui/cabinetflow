import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['src/lib/**', 'supabase/functions/_shared/**'] },
  },
})
