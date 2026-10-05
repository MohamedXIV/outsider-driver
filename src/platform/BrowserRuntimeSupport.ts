import { Engine } from '@babylonjs/core/Engines/engine';

export type BrowserRuntimeCapability =
  | 'webgl'
  | 'webassembly';

export interface BrowserRuntimeCapabilities {
  readonly webgl: boolean;
  readonly webassembly: boolean;
}

export interface BrowserRuntimeSupportReport
  extends BrowserRuntimeCapabilities {
  readonly supported: boolean;
  readonly missing: readonly BrowserRuntimeCapability[];
}

export function evaluateBrowserRuntimeSupport(
  capabilities: BrowserRuntimeCapabilities,
): BrowserRuntimeSupportReport {
  const missing: BrowserRuntimeCapability[] = [];

  if (!capabilities.webgl) {
    missing.push('webgl');
  }

  if (!capabilities.webassembly) {
    missing.push('webassembly');
  }

  return {
    ...capabilities,
    supported: missing.length === 0,
    missing,
  };
}

export function detectBrowserRuntimeSupport(): BrowserRuntimeSupportReport {
  return evaluateBrowserRuntimeSupport({
    webgl: Engine.IsSupported,
    webassembly:
      typeof WebAssembly === 'object' &&
      typeof WebAssembly.instantiate === 'function',
  });
}
