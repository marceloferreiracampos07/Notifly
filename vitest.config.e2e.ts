import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/integration/**/*.e2e-spec.ts'],
    globalSetup: ['./test/integration/global-setup.ts'],
    setupFiles: ['./test/integration/setup-env.ts'],
    fileParallelism: false,
    hookTimeout: 180_000,
    testTimeout: 60_000,
  },
});
