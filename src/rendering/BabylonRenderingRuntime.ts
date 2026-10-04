import { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import type { RenderingRuntimePort } from '../app/ports/RenderingRuntimePort';
import { createBootScene } from './scenes/createBootScene';

export class BabylonRenderingRuntime implements RenderingRuntimePort {
  readonly #engine: Engine;
  readonly #scene: Scene;
  readonly #renderFrame = (): void => {
    this.#scene.render();
  };
  readonly #resize = (): void => {
    this.#engine.resize();
  };
  #started = false;
  #disposed = false;

  public constructor(canvas: HTMLCanvasElement) {
    this.#engine = new Engine(canvas, true, { stencil: true }, true);
    this.#scene = createBootScene(this.#engine);
  }

  public start(): void {
    if (this.#disposed) {
      throw new Error('Cannot start a disposed BabylonRenderingRuntime.');
    }

    if (this.#started) {
      return;
    }

    window.addEventListener('resize', this.#resize);
    this.#engine.runRenderLoop(this.#renderFrame);
    this.#started = true;
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    window.removeEventListener('resize', this.#resize);
    this.#engine.stopRenderLoop(this.#renderFrame);
    this.#scene.dispose();
    this.#engine.dispose();
    this.#started = false;
    this.#disposed = true;
  }
}
