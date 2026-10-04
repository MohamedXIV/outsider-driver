import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { Scene } from '@babylonjs/core/scene';
import type { TaxiSceneDefinition } from '../../content/presentation/TaxiSceneDefinition';
import {
  createTaxiScene,
  type TaxiSceneHandle,
} from '../taxi/createTaxiScene';
import { createBootScene } from './createBootScene';

export class BabylonSceneOrchestrator {
  readonly #engine: AbstractEngine;
  #activeScene: Scene;
  #activeKind: 'boot' | 'taxi' = 'boot';
  #taxiScene: TaxiSceneHandle | null = null;
  #disposed = false;

  public constructor(engine: AbstractEngine) {
    this.#engine = engine;
    this.#activeScene = createBootScene(engine);
  }

  public showTaxi(definition: TaxiSceneDefinition): TaxiSceneHandle {
    this.#assertAlive();

    const nextTaxiScene = createTaxiScene(this.#engine, definition);
    const previousScene = this.#activeScene;

    this.#activeScene = nextTaxiScene.scene;
    this.#activeKind = 'taxi';
    this.#taxiScene = nextTaxiScene;
    previousScene.dispose();

    return nextTaxiScene;
  }

  public getTaxiScene(): TaxiSceneHandle | null {
    return this.#taxiScene;
  }

  public getActiveSceneKind(): 'boot' | 'taxi' {
    return this.#activeKind;
  }

  public render(): void {
    this.#assertAlive();
    this.#activeScene.render();
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#activeScene.dispose();
    this.#taxiScene = null;
    this.#disposed = true;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('Cannot use a disposed BabylonSceneOrchestrator.');
    }
  }
}
