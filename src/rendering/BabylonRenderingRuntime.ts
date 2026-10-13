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
import { RouteSceneryPresenter } from './routes/RouteSceneryPresenter';
import { getRouteProgressSnapshot } from '../domain/travel/RouteProgression';
import type { GameState } from '../persistence/save/gameSave';
import { entityIdSchema, type RouteSegmentId } from '../domain/ids/EntityId';

export class BabylonRenderingRuntime
  implements RenderingRuntimePort, PersonalSpacePresentationPort
{
  readonly #engine: Engine;
  readonly #scenes: BabylonSceneOrchestrator;
  #routeScenery: RouteSceneryPresenter | null = null;
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
      this.#routeScenery = new RouteSceneryPresenter(
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
