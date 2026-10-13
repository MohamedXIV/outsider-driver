import { readFile } from 'node:fs/promises';
import { Compiler } from 'inkjs/full';
import type { Plugin } from 'vite';
import { validateInkSourceContract } from '../narrative/InkSourceContract';

/**
 * Compile authored Ink in Vite's Node process, never in the browser.
 * The imported module contains an immutable JSON story and its externally
 * declared functions, avoiding bundling inkjs/full into the game client.
 */
export function compiledInkPlugin(): Plugin {
  return {
    name: 'outsider-compiled-ink',
    enforce: 'pre',
    async load(id) {
      const suffix = '.ink?compiled';
      if (!id.endsWith(suffix)) return null;

      const path = id.slice(0, -'?compiled'.length);
      const source = await readFile(path, 'utf8');
      const declaredExternals = validateInkSourceContract(source);

      try {
        const json = new Compiler(source).Compile().ToJson();
        if (typeof json !== 'string' || json.length === 0) {
          throw new Error('Ink compiler produced an empty story.');
        }
        return `export default ${JSON.stringify({ json, declaredExternals })};`;
      } catch (error: unknown) {
        throw new Error(
          `Failed to compile Ink story ${path}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    },
  };
}
