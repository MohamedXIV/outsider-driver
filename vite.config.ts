import { defineConfig } from 'vite';
import { compiledInkPlugin } from './src/build/compiledInkPlugin';

export default defineConfig({
  plugins: [compiledInkPlugin()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    host: true,
  },
});
