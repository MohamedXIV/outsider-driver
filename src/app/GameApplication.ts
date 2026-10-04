import type { RenderingRuntimePort } from './ports/RenderingRuntimePort';

export class GameApplication {
  readonly #rendering: RenderingRuntimePort;
  #started = false;
  #disposed = false;

  public constructor(rendering: RenderingRuntimePort) {
    this.#rendering = rendering;
  }

  public start(): void {
    if (this.#disposed) {
      throw new Error('Cannot start a disposed GameApplication.');
    }

    if (this.#started) {
      return;
    }

    this.#rendering.start();
    this.#started = true;
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#rendering.dispose();
    this.#started = false;
    this.#disposed = true;
  }
}
