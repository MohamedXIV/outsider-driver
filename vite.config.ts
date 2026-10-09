import { defineConfig } from 'vite';
import { compiledInkPlugin } from './src/build/compiledInkPlugin';

// Build-time diagnostics only. No extra client code or budget changes.
// Track both the emitted chunks and the modules that dominate the entry.
function bundleAttributionPlugin() {
  return {
    name: 'outsider-bundle-attribution',
    apply: 'build' as const,
    generateBundle(
      _options: unknown,
      bundle: Record<string, { type: string; isEntry?: boolean; code?: string; modules?: Record<string, { renderedLength: number }> }>,
    ) {
      const chunks = Object.entries(bundle)
        .filter(([, output]) => output.type === 'chunk')
        .map(([name, output]) => ({
          name,
          size: Buffer.byteLength(output.code ?? '', 'utf8'),
          isEntry: output.isEntry ?? false,
          modules: output.modules ?? {},
        }))
        .sort((a, b) => b.size - a.size);

      for (const chunk of chunks) {
        console.info(
          `[bundle] ${chunk.isEntry ? 'entry' : 'chunk'} ${chunk.name}: ${chunk.size.toLocaleString('en-US')} bytes`,
        );
      }

      const entry = chunks.find((chunk) => chunk.isEntry);
      if (entry !== undefined) {
        const majorModules = Object.entries(entry.modules)
          .map(([name, module]) => ({
            name: name.replaceAll('\\', '/').replace(/^.*?\/node_modules\//, 'node_modules/'),
            bytes: module.renderedLength,
          }))
          .filter((module) => module.bytes > 0)
          .sort((a, b) => b.bytes - a.bytes)
          .slice(0, 18);
        console.info('[bundle] Largest rendered entry modules:');
        for (const module of majorModules) {
          console.info(
            `[bundle]   ${module.bytes.toLocaleString('en-US')} B ${module.name}`,
          );
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [compiledInkPlugin(), bundleAttributionPlugin()],
  build: {
    // The supported Chromium/Firefox/WebKit generations all implement ES2024
    // and modulepreload; avoid shipping transforms and a legacy preload shim.
    target: 'es2024',
    modulePreload: { polyfill: false },
    // Keep map files for debugging without shipping per-chunk map URL comments.
    sourcemap: 'hidden',
    rolldownOptions: {
      output: {
        // Keep module-private names minified. Test the actual runtime in the
        // canonical cross-browser suite: public export/property names remain
        // untouched and runtime contract must behave byte-for-byte.
        minify: { mangle: { toplevel: true } },
        // Keep Ink's runtime and schema validation in independently cached
        // browser modules. Do not alter the authored narrative or loading API.
        // Chunk attribution and the strict size checks quantify the result.
        manualChunks(id: string) {
          const normalized = id.replaceAll('\\', '/');
          if (normalized.includes('/node_modules/inkjs/')) {
            return 'ink-runtime';
          }
          if (normalized.includes('/node_modules/zod/')) {
            return 'validation';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
  },
});
