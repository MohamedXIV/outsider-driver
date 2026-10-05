import { Engine } from '@babylonjs/core/Engines/engine';
import type { RenderingRuntimePort } from '../app/ports/RenderingRuntimePort';
import type {
  PersonalSpaceFlagResolver,
  PersonalSpacePresentationPort,
} from '../app/spaces/PersonalSpaceOrchestrator';
import type { PersonalSpaceDefinition } from '../content/spaces/PersonalSpaceContracts';
import { productionContent } from '../content/production/ProductionContent';
import { BabylonSceneOrchestrator } from './scenes/BabylonSceneOrchestrator';

export class BabylonRenderingRuntime
  implements RenderingRuntimePort, PersonalSpacePresentationPort
{
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
    this.#scenes.showTaxi(productionContent.taxiScene);
  }

  public showTaxi(): void {
    this.#assertAlive();
    this.#scenes.showTaxi(productionContent.taxiScene);
  }

  public showPersonalSpace(
    definition: PersonalSpaceDefinition,
    resolveFlag: PersonalSpaceFlagResolver,
  ): void {
    this.#assertAlive();
    this.#scenes.showPersonalSpace(
      definition,
      resolveFlag,
      true,
    );
  }

  public refreshPersonalSpaceFlags(
    resolveFlag: PersonalSpaceFlagResolver,
  ): void {
    this.#assertAlive();
    this.#scenes.refreshPersonalSpaceFlags(resolveFlag);
  }

  public start(): void {
    this.#assertAlive();

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

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('Cannot use a disposed BabylonRenderingRuntime.');
    }
  }
}
