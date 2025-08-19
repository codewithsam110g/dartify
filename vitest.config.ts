// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins:[tsconfigPaths()],
  test: {
    // Enable snapshot testing
    resolveSnapshotPath: (testPath, snapExtension) => {
      // Organize snapshots in a dedicated folder
      return testPath.replace("/test/", "/test/__snapshots__/") + snapExtension;
    },

    // Update snapshots with --update flag
    // Run: npm test -- --update or vitest --update

    // Parallel execution for faster testing
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Test timeout for large files
    testTimeout: 30000,

    // Coverage settings (optional)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/", "def_files/", "**/*.d.ts"],
    },

    // Global test setup
    globals: true,

    // File patterns
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".git", "def_files"],
  },
});
