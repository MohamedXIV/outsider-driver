import * as z from 'zod';
import {
  entityIdSchema,
  type RouteId,
  type RouteSegmentId,
} from '../ids/EntityId';
import {
  validateWorldContentCatalog,
  type RouteDocument,
  type RouteSegmentDocument,
  type WorldContentCatalog,
} from '../../content/world/WorldContracts';

const TravellingRouteProgressSchema = z
  .object({
    status: z.literal('travelling'),
    routeId: entityIdSchema('route'),
    currentSegmentId: entityIdSchema('route-segment'),
    segmentElapsedMinutes: z.number().min(0),
    routeElapsedMinutes: z.number().min(0),
  })
  .strict();

const ArrivedRouteProgressSchema = z
  .object({
    status: z.literal('arrived'),
    routeId: entityIdSchema('route'),
    routeElapsedMinutes: z.number().min(0),
  })
  .strict();

export const RouteProgressStateSchema = z.discriminatedUnion('status', [
  TravellingRouteProgressSchema,
  ArrivedRouteProgressSchema,
]);

export type RouteProgressState = z.infer<typeof RouteProgressStateSchema>;

export interface RouteProgressSnapshot {
  readonly state: RouteProgressState;
  readonly segmentProgress: number;
  readonly routeProgress: number;
}

function requireRoute(
  routeId: RouteId,
  catalog: WorldContentCatalog,
): RouteDocument {
  const route = catalog.routes.find((candidate) => candidate.id === routeId);

  if (route === undefined) {
    throw new Error(`Unknown route: ${routeId}`);
  }

  return route;
}

function requireSegment(
  segmentId: RouteSegmentId,
  catalog: WorldContentCatalog,
): RouteSegmentDocument {
  const segment = catalog.routeSegments.find(
    (candidate) => candidate.id === segmentId,
  );

  if (segment === undefined) {
    throw new Error(`Unknown route segment: ${segmentId}`);
  }

  return segment;
}

function routeDurationMinutes(
  route: RouteDocument,
  catalog: WorldContentCatalog,
): number {
  return route.data.segmentIds.reduce(
    (total, segmentId) =>
      total + requireSegment(segmentId, catalog).data.durationMinutes,
    0,
  );
}

export function createRouteProgress(
  routeId: RouteId,
  worldInput: unknown,
): RouteProgressState {
  const catalog = validateWorldContentCatalog(worldInput);
  const route = requireRoute(routeId, catalog);
  const firstSegmentId = route.data.segmentIds[0];

  if (firstSegmentId === undefined) {
    throw new Error('Validated route unexpectedly has no segments.');
  }

  return {
    status: 'travelling',
    routeId,
    currentSegmentId: firstSegmentId,
    segmentElapsedMinutes: 0,
    routeElapsedMinutes: 0,
  };
}

export function advanceRouteProgress(
  stateInput: RouteProgressState,
  deltaGameMinutes: number,
  worldInput: unknown,
): RouteProgressState {
  if (!Number.isFinite(deltaGameMinutes) || deltaGameMinutes < 0) {
    throw new RangeError('Route delta must be a finite non-negative number.');
  }

  const state = RouteProgressStateSchema.parse(stateInput);

  if (state.status === 'arrived' || deltaGameMinutes === 0) {
    return state;
  }

  const catalog = validateWorldContentCatalog(worldInput);
  const route = requireRoute(state.routeId, catalog);
  let currentSegmentId = state.currentSegmentId;
  let segmentElapsedMinutes = state.segmentElapsedMinutes;
  let routeElapsedMinutes = state.routeElapsedMinutes;
  let remainingDelta = deltaGameMinutes;

  while (remainingDelta > 0) {
    const segment = requireSegment(currentSegmentId, catalog);
    const remainingSegmentMinutes =
      segment.data.durationMinutes - segmentElapsedMinutes;

    if (remainingDelta < remainingSegmentMinutes) {
      segmentElapsedMinutes += remainingDelta;
      routeElapsedMinutes += remainingDelta;
      remainingDelta = 0;
      break;
    }

    routeElapsedMinutes += remainingSegmentMinutes;
    remainingDelta -= remainingSegmentMinutes;

    const currentIndex = route.data.segmentIds.indexOf(currentSegmentId);
    const nextSegmentId = route.data.segmentIds[currentIndex + 1];

    if (currentIndex < 0 || nextSegmentId === undefined) {
      return {
        status: 'arrived',
        routeId: state.routeId,
        routeElapsedMinutes,
      };
    }

    currentSegmentId = nextSegmentId;
    segmentElapsedMinutes = 0;
  }

  return {
    status: 'travelling',
    routeId: state.routeId,
    currentSegmentId,
    segmentElapsedMinutes,
    routeElapsedMinutes,
  };
}

export function getRouteProgressSnapshot(
  stateInput: RouteProgressState,
  worldInput: unknown,
): RouteProgressSnapshot {
  const state = RouteProgressStateSchema.parse(stateInput);
  const catalog = validateWorldContentCatalog(worldInput);
  const route = requireRoute(state.routeId, catalog);
  const totalDuration = routeDurationMinutes(route, catalog);

  if (state.status === 'arrived') {
    return {
      state,
      segmentProgress: 1,
      routeProgress: 1,
    };
  }

  const segment = requireSegment(state.currentSegmentId, catalog);

  return {
    state,
    segmentProgress:
      state.segmentElapsedMinutes / segment.data.durationMinutes,
    routeProgress:
      totalDuration === 0 ? 1 : state.routeElapsedMinutes / totalDuration,
  };
}
