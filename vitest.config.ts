import { defineConfig } from 'vitest/config';
import { compiledInkPlugin } from './src/build/compiledInkPlugin';

export default defineConfig({
  plugins: [compiledInkPlugin()],
  test: {
    environment: 'node',
    exclude: ['tests/browser/**', 'node_modules/**', 'dist/**'],
  },
});
