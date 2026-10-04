/**
 * Application-facing rendering lifecycle. Babylon.js stays behind this port so
 * game orchestration never needs to own renderer-specific state.
 */
export interface RenderingRuntimePort {
  start(): void;
  dispose(): void;
}
