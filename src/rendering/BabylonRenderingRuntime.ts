import { Engine } from '@babylonjs/core/Engines/engine';
import type { RenderingRuntimePort } from '../app/ports/RenderingRuntimePort';
import { defaultTaxiSceneDefinition } from '../content/presentation/defaultTaxiScene';
import { BabylonSceneOrchestrator } from './scenes/BabylonSceneOrchestrator';

export class BabylonRenderingRuntime implements RenderingRuntimePort {
  readonly #engine: Engine;
  readonly #scenes: BabylonSceneOrchestrator;
  readonly #renderFrame = (): void => {
    this.#scenes.render();
  };
  readonly #resize = (): void => {
    this.#engine.resize();
  };
  #started = false;
  #disposed = false;

  public constructor(canvas: HTMLCanvasElement) {
    this.#engine = new Engine(canvas, true, { stencil: true }, true);
    this.#scenes = new BabylonSceneOrchestrator(this.#engine);
    this.#scenes.showTaxi(defaultTaxiSceneDefinition);
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
    this.#scenes.dispose();
    this.#engine.dispose();
    this.#started = false;
    this.#disposed = true;
  }
}
