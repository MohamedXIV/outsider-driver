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

  public step(deltaSeconds: number): TaxiAutopilotSnapshot {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError(
        'Autopilot delta must be a finite non-negative number.',
      );
    }

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
    const motion = this.#sampleMotion(routeSnapshot);

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
      return RouteMotionSampleSchema.parse({
        progress: 1,
        targetSpeedMps: 0,
        curvature: 0,
        surfaceRoughness: 0,
      });
    }

    const profile = requireMotionProfile(
      this.#motionCatalog,
      route.state.currentSegmentId,
    );

    return sampleRouteMotion(profile, route.segmentProgress);
  }
}
