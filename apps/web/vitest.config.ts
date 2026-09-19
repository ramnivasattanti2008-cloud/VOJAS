import { defineConfig } from 'vitest/config';

// Unit tests for pure logic only (lib/, formatting, calculations) — no DOM
// needed, so 'node' rather than 'jsdom'/'happy-dom'. Component/page rendering
// is not covered here; see the CLAUDE.md note on browser verification for
// UI/feature correctness.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    // Pinned so date/time formatting assertions are deterministic regardless
    // of the machine or CI runner's local timezone.
    env: { TZ: 'Asia/Kolkata' },
  },
});
