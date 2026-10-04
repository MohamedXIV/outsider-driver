import { describe, expect, it } from 'vitest';
import { createRouteExperienceFixture } from '../../content/routes/fixtures/routeExperienceFixture';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import { entityId } from '../ids/EntityId';
import { buildRouteEventTimeline } from './RouteEventTimeline';

describe('RouteEventTimeline', () => {
  it('maps authored segment progress to deterministic route elapsed time', () => {
    const timeline = buildRouteEventTimeline(
      entityId('route', 'docks-night'),
      createWorldFixture(),
      createRouteExperienceFixture(),
    );

    expect(timeline).toEqual([
      {
        eventId: 'route-event:docks-checkpoint',
        segmentId: 'route-segment:docks-night-01',
        hookId: 'checkpoint.customs-light',
        routeElapsedMinutes: 5.2,
        behavior: {
          type: 'checkpoint',
          checkpointId: 'customs-light',
        },
      },
    ]);
  });
});
