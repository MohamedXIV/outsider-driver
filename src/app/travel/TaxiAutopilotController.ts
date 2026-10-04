import type { RouteId, RouteSegmentId } from '../../domain/ids/EntityId';
import {
  RouteMotionSampleSchema,
  sampleRouteMotion,
  validateRouteMotionCatalog,
  type RouteMotionCatalog,
  type RouteMotionSample,
} from '../../content/routes/RouteMotionProfiles';
import {
  validateWorldContentCatalog,
  type WorldContentCatalog,
} from '../../content/world/WorldContracts';
import {
  RouteProgressStateSchema,
  advanceRouteProgress,
  createRouteProgress,
  getRouteProgressSnapshot,
  type RouteProgressSnapshot,
  type RouteProgressState,
} from '../../domain/travel/RouteProgression';
import {
  createVehicleDynamicsState,
  defaultVehicleDynamicsParameters,
  stepVehicleDynamics,
  type VehicleDynamicsParameters,
  type VehicleDynamicsState,
} from '../../domain/vehicle/VehicleDynamics';

export interface TaxiAutopilotConfig {
  readonly gameMinutesPerRealSecond: number;
  readonly dynamics?: VehicleDynamicsParameters;
}

export interface TaxiAutopilotSnapshot {
  readonly route: RouteProgressSnapshot;
  readonly dynamics: VehicleDynamicsState;
}

function requireMotionProfile(
  catalog: RouteMotionCatalog,
  segmentId: RouteSegmentId,
) {
  const profile = catalog.profiles.find(
    (candidate) => candidate.segmentId === segmentId,
  );

  if (profile === undefined) {
    throw new Error(`Missing motion profile for segment: ${segmentId}`);
  }

  return profile;
}

function stoppedMotion(): RouteMotionSample {
  return RouteMotionSampleSchema.parse({
    progress: 1,
    targetSpeedMps: 0,
    curvature: 0,
    surfaceRoughness: 0,
  });
}

export class TaxiAutopilotController {
  readonly #world: WorldContentCatalog;
  readonly #motionCatalog: RouteMotionCatalog;
  readonly #gameMinutesPerRealSecond: number;
  readonly #dynamicsParameters: VehicleDynamicsParameters;
  #routeState: RouteProgressState;
  #dynamicsState = createVehicleDynamicsState();

  public constructor(
    routeId: RouteId,
    worldInput: unknown,
    motionCatalogInput: unknown,
    config: TaxiAutopilotConfig,
  ) {
    if (
      !Number.isFinite(config.gameMinutesPerRealSecond) ||
      config.gameMinutesPerRealSecond <= 0
    ) {
      throw new RangeError(
        'gameMinutesPerRealSecond must be a finite positive number.',
      );
    }

    this.#world = validateWorldContentCatalog(worldInput);
    this.#motionCatalog = validateRouteMotionCatalog(
      motionCatalogInput,
      this.#world,
    );
    this.#gameMinutesPerRealSecond = config.gameMinutesPerRealSecond;
    this.#dynamicsParameters =
      config.dynamics ?? defaultVehicleDynamicsParameters;
    this.#routeState = createRouteProgress(routeId, this.#world);
  }

  public getSnapshot(): TaxiAutopilotSnapshot {
    return {
      route: getRouteProgressSnapshot(this.#routeState, this.#world),
      dynamics: this.#dynamicsState,
    };
  }

  public getRouteState(): RouteProgressState {
    return RouteProgressStateSchema.parse(this.#routeState);
  }

  public restoreRouteState(input: unknown): TaxiAutopilotSnapshot {
    const state = RouteProgressStateSchema.parse(input);

    getRouteProgressSnapshot(state, this.#world);
    this.#routeState = state;
    this.#dynamicsState = createVehicleDynamicsState();

    return this.getSnapshot();
  }

  public step(deltaSeconds: number): TaxiAutopilotSnapshot {
    this.#validateDelta(deltaSeconds);

    const deltaGameMinutes =
      deltaSeconds * this.#gameMinutesPerRealSecond;
    this.#routeState = advanceRouteProgress(
      this.#routeState,
      deltaGameMinutes,
      this.#world,
    );

    const routeSnapshot = getRouteProgressSnapshot(
      this.#routeState,
      this.#world,
    );

    return this.#stepDynamics(
      routeSnapshot,
      this.#sampleMotion(routeSnapshot),
      deltaSeconds,
    );
  }

  public settle(deltaSeconds: number): TaxiAutopilotSnapshot {
    this.#validateDelta(deltaSeconds);

    return this.#stepDynamics(
      getRouteProgressSnapshot(this.#routeState, this.#world),
      stoppedMotion(),
      deltaSeconds,
    );
  }

  public replaceRoute(routeId: RouteId): TaxiAutopilotSnapshot {
    this.#routeState = createRouteProgress(routeId, this.#world);
    return this.getSnapshot();
  }

  #stepDynamics(
    routeSnapshot: RouteProgressSnapshot,
    motion: RouteMotionSample,
    deltaSeconds: number,
  ): TaxiAutopilotSnapshot {
    this.#dynamicsState = stepVehicleDynamics(
      this.#dynamicsState,
      motion,
      this.#dynamicsParameters,
      deltaSeconds,
    );

    return {
      route: routeSnapshot,
      dynamics: this.#dynamicsState,
    };
  }

  #sampleMotion(route: RouteProgressSnapshot): RouteMotionSample {
    if (route.state.status === 'arrived') {
      return stoppedMotion();
    }

    const profile = requireMotionProfile(
      this.#motionCatalog,
      route.state.currentSegmentId,
    );

    return sampleRouteMotion(profile, route.segmentProgress);
  }

  #validateDelta(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError(
        'Autopilot delta must be a finite non-negative number.',
      );
    }
  }
}
