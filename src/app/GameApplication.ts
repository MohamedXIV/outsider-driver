import type { RenderingRuntimePort } from './ports/RenderingRuntimePort';
import type { GameSession } from './session/GameSession';

export class GameApplication {
  readonly #rendering: RenderingRuntimePort;
  readonly #session: GameSession | null;
  #started = false;
  #disposed = false;

  public constructor(
    rendering: RenderingRuntimePort,
    session: GameSession | null = null,
  ) {
    this.#rendering = rendering;
    this.#session = session;
  }

  public getSession(): GameSession | null {
    return this.#session;
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

    this.#started = false;
    this.#disposed = true;
    try {
      this.#rendering.dispose();
    } finally {
      this.#session?.dispose();
    }
  }
}
