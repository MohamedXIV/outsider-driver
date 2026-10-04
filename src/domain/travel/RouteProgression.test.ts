import { describe, expect, it } from 'vitest';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import { entityId } from '../ids/EntityId';
import {
  advanceRouteProgress,
  createRouteProgress,
  getRouteProgressSnapshot,
} from './RouteProgression';

const routeId = entityId('route', 'docks-night');

describe('RouteProgression', () => {
  it('advances automatically through authored segment duration to arrival', () => {
    const world = createWorldFixture();
    const initial = createRouteProgress(routeId, world);
    const midway = advanceRouteProgress(initial, 4, world);
    const midwaySnapshot = getRouteProgressSnapshot(midway, world);

    expect(midwaySnapshot.routeProgress).toBe(0.5);
    expect(midwaySnapshot.segmentProgress).toBe(0.5);

    const arrived = advanceRouteProgress(midway, 4, world);
    const arrivedSnapshot = getRouteProgressSnapshot(arrived, world);

    expect(arrived.status).toBe('arrived');
    expect(arrivedSnapshot.routeProgress).toBe(1);
    expect(arrivedSnapshot.routeElapsedMinutes).toBe(8);
  });

  it('can consume an oversized deterministic delta without overshooting state', () => {
    const world = createWorldFixture();
    const initial = createRouteProgress(routeId, world);
    const arrived = advanceRouteProgress(initial, 100, world);

    expect(arrived).toEqual({
      status: 'arrived',
      routeId,
    });
  });

  it('rejects progress that points at a segment outside the route', () => {
    expect(() =>
      getRouteProgressSnapshot(
        {
          status: 'travelling',
          routeId,
          currentSegmentId: entityId('route-segment', 'foreign'),
          segmentElapsedMinutes: 0,
        },
        createWorldFixture(),
      ),
    ).toThrow(/does not belong to route/);
  });
});
