import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Separate from the Vite config: the build must not know about the tests.
export default defineConfig({
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    test: {
        include: ['test/**/*.test.ts'],
        environment: 'node',
        setupFiles: ['test/setup.ts'],
        // The exhaustive matrices run many thousands of cases.
        testTimeout: 300_000,
    },
});
