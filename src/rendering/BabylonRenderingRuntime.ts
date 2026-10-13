import { Engine } from '@babylonjs/core/Engines/engine';
import type { RenderingRuntimePort } from '../app/ports/RenderingRuntimePort';
import type { AccessibilityPreferencesStore } from '../domain/preferences/AccessibilityPreferencesState';
import type {
  PersonalSpaceFlagResolver,
  PersonalSpacePresentationPort,
} from '../app/spaces/PersonalSpaceOrchestrator';
import type { PersonalSpaceDefinition } from '../content/spaces/PersonalSpaceContracts';
import { productionContent } from '../content/production/ProductionContent';
import { BabylonSceneOrchestrator } from './scenes/BabylonSceneOrchestrator';
import type { RouteSceneryPresenter } from './routes/RouteSceneryPresenter';
import { getRouteProgressSnapshot } from '../domain/travel/RouteProgression';
import type { GameState } from '../persistence/save/gameSave';
import { entityIdSchema, type RouteSegmentId } from '../domain/ids/EntityId';

export class BabylonRenderingRuntime
  implements RenderingRuntimePort, PersonalSpacePresentationPort
{
  readonly #engine: Engine;
  readonly #scenes: BabylonSceneOrchestrator;
  #routeScenery: RouteSceneryPresenter | null = null;
  #routeSceneryConstructor: typeof RouteSceneryPresenter | null = null;
  #routeSceneryLoad: Promise<void> | null = null;
  #latestRouteState: GameState | null = null;
  readonly #unsubscribePreferences: () => void;
  readonly #renderFrame = (): void => {
    this.#scenes.render();
  };
  readonly #resize = (): void => {
    this.#engine.resize();
  };
  #started = false;
  #disposed = false;

  public constructor(
    canvas: HTMLCanvasElement,
    preferences: AccessibilityPreferencesStore,
  ) {
    this.#engine = new Engine(canvas, true, { stencil: true }, true);
    this.#scenes = new BabylonSceneOrchestrator(this.#engine);
    this.#unsubscribePreferences = preferences.subscribe(
      (state) => {
        this.#scenes.applyAccessibilityPreferences(state);
      },
    );
    this.#scenes.showTaxi(productionContent.taxiScene);
  }

  public showTaxi(): void {
    this.#assertAlive();
    this.#clearRouteScenery();
    this.#scenes.showTaxi(productionContent.taxiScene);
  }

  /**
   * The presentation listens only to successfully committed session state.
   * Never changes time, location, credits or route progression. Updating
   * meshes happens when the existing explicit autopilot step commits.
   */
  public syncAuthoredRoute(state: GameState): void {
    this.#assertAlive();
    this.#latestRouteState = state;
    const taxi = this.#scenes.getTaxiScene();
    const ride = state.rideSession;
    if (taxi === null || state.personalSpaceState.currentSpaceId !== null ||
        ride === null || ride.phase === 'assigned' ||
        (ride.phase === 'completed' && state.arrivedLocationId === null)) {
      this.#clearRouteScenery();
      return;
    }

    let segmentId: RouteSegmentId;
    let progress: number;
    if (ride.phase === 'completed') {
      const route = productionContent.world.routes.find(
        (entry) => entry.id === ride.finalRouteId,
      );
      const finalSegment = route?.data.segmentIds.at(-1);
      if (finalSegment === undefined) {
        throw new Error('Completed ride is missing its authored final scenery segment.');
      }
      segmentId = entityIdSchema('route-segment').parse(finalSegment);
      progress = 1;
    } else {
      const routeState = ride.routeFlow.routeState;
      const snapshot = getRouteProgressSnapshot(routeState, productionContent.world);
      if (routeState.status === 'travelling') {
        segmentId = routeState.currentSegmentId;
        progress = snapshot.segmentProgress;
      } else {
        const route = productionContent.world.routes.find(
          (entry) => entry.id === routeState.routeId,
        );
        const finalSegment = route?.data.segmentIds.at(-1);
        if (finalSegment === undefined) {
          throw new Error('Arrived ride has no authored final scenery segment.');
        }
        segmentId = entityIdSchema('route-segment').parse(finalSegment);
        progress = 1;
      }
    }

    if (this.#routeScenery === null) {
      // The first ride imports the scenery presentation module. Normal
      // startup/home/garage does not download its mesh/material machinery.
      if (this.#routeSceneryConstructor === null) {
        if (this.#routeSceneryLoad === null) {
          this.#routeSceneryLoad = import('./routes/RouteSceneryPresenter')
            .then(({ RouteSceneryPresenter: Constructor }) => {
              this.#routeSceneryConstructor = Constructor;
              this.#routeSceneryLoad = null;
              // Use the latest committed state. An older route could already
              // have ended or the player could have returned to the garage.
              if (!this.#disposed && this.#latestRouteState !== null) {
                this.syncAuthoredRoute(this.#latestRouteState);
              }
            })
            .catch((error: unknown) => {
              this.#routeSceneryLoad = null;
              // A failed graphics import cannot roll back a successful ride.
              console.error('Optional route scenery unavailable.', error);
            });
        }
        return;
      }
      this.#routeScenery = new this.#routeSceneryConstructor(
        taxi,
        productionContent.world,
        productionContent.routeExperience,
      );
    }
    if (this.#routeScenery.getActiveSegmentId() !== segmentId) {
      const daytime = state.gameTime.minuteOfDay >= 6 * 60 &&
        state.gameTime.minuteOfDay < 18 * 60;
      this.#routeScenery.showSegment(segmentId, {
        daylightFactor: daytime ? 0.7 : 0.1,
        precipitation: 0,
      });
    }
    this.#routeScenery.setProgress(progress);
  }

  public getVisibleRouteSegmentId(): RouteSegmentId | null {
    return this.#routeScenery?.getActiveSegmentId() ?? null;
  }

  #clearRouteScenery(): void {
    this.#routeScenery?.dispose();
    this.#routeScenery = null;
    this.#latestRouteState = null;
  }

  public showPersonalSpace(
    definition: PersonalSpaceDefinition,
    resolveFlag: PersonalSpaceFlagResolver,
  ): void {
    this.#assertAlive();
    this.#clearRouteScenery();
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
    this.#unsubscribePreferences();
    this.#clearRouteScenery();
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
