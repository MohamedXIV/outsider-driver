import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import {
  AccessibilityPreferencesStateSchema,
  createInitialAccessibilityPreferencesState,
  type AccessibilityPreferencesState,
} from '../../domain/preferences/AccessibilityPreferencesState';
import type { Scene } from '@babylonjs/core/scene';
import type { TaxiSceneDefinition } from '../../content/presentation/TaxiSceneDefinition';
import type { PersonalSpaceDefinition } from '../../content/spaces/PersonalSpaceContracts';
import {
  createPersonalSpaceScene,
  type PersonalSpaceFlagResolver,
  type PersonalSpaceSceneHandle,
} from '../spaces/createPersonalSpaceScene';
import {
  createTaxiScene,
  type TaxiSceneHandle,
} from '../taxi/createTaxiScene';
import { createBootScene } from './createBootScene';

export type BabylonSceneKind = 'boot' | 'taxi' | 'personal-space';

export class BabylonSceneOrchestrator {
  readonly #engine: AbstractEngine;
  #activeScene: Scene;
  #activeKind: BabylonSceneKind = 'boot';
  #taxiScene: TaxiSceneHandle | null = null;
  #personalSpaceScene: PersonalSpaceSceneHandle | null = null;
  #accessibilityPreferences: AccessibilityPreferencesState =
    createInitialAccessibilityPreferencesState();
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
    this.#personalSpaceScene = null;
    previousScene.dispose();

    return nextTaxiScene;
  }

  public showPersonalSpace(
    definition: PersonalSpaceDefinition,
    resolveFlag: PersonalSpaceFlagResolver,
    attachControls: boolean,
  ): PersonalSpaceSceneHandle {
    this.#assertAlive();

    const nextSpace = createPersonalSpaceScene(
      this.#engine,
      definition,
      {
        attachControls,
        resolveFlag,
        accessibilityPreferences:
          this.#accessibilityPreferences,
      },
    );
    const previousScene = this.#activeScene;

    this.#activeScene = nextSpace.scene;
    this.#activeKind = 'personal-space';
    this.#taxiScene = null;
    this.#personalSpaceScene = nextSpace;
    previousScene.dispose();

    return nextSpace;
  }

  public applyAccessibilityPreferences(
    preferencesInput: AccessibilityPreferencesState,
  ): void {
    this.#assertAlive();
    this.#accessibilityPreferences =
      AccessibilityPreferencesStateSchema.parse(
        preferencesInput,
      );

    this.#personalSpaceScene?.applyAccessibilityPreferences(
      this.#accessibilityPreferences,
    );
  }

  public refreshPersonalSpaceFlags(
    resolveFlag: PersonalSpaceFlagResolver,
  ): void {
    this.#assertAlive();

    if (this.#personalSpaceScene === null) {
      throw new Error(
        'Cannot refresh personal-space flags when no personal space scene is active.',
      );
    }

    this.#personalSpaceScene.refreshVisibility(resolveFlag);
  }

  public getTaxiScene(): TaxiSceneHandle | null {
    return this.#taxiScene;
  }

  public getPersonalSpaceScene(): PersonalSpaceSceneHandle | null {
    return this.#personalSpaceScene;
  }

  public getActiveSceneKind(): BabylonSceneKind {
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
    this.#personalSpaceScene = null;
    this.#disposed = true;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('Cannot use a disposed BabylonSceneOrchestrator.');
    }
  }
}
