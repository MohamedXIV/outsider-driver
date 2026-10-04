import { describe, expect, it } from 'vitest';
import { createRouteExperienceFixture } from '../../content/routes/fixtures/routeExperienceFixture';
import { createBranchingRouteFlowFixture } from '../../content/routes/fixtures/branchingRouteFlowFixture';
import { createRouteMotionFixture } from '../../content/routes/fixtures/routeMotionFixture';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import { entityId } from '../../domain/ids/EntityId';
import { RouteFlowController } from './RouteFlowController';

describe('RouteFlowController', () => {
  it('pauses exactly at a checkpoint and holds route progress while paused', () => {
    const flow = new RouteFlowController(
      entityId('route', 'docks-night'),
      createWorldFixture(),
      createRouteMotionFixture(),
      createRouteExperienceFixture(),
      {
        gameMinutesPerRealSecond: 2,
      },
    );

    const interrupted = flow.step(3);

    expect(interrupted.consumedSeconds).toBeCloseTo(2.6);
    expect(interrupted.snapshot.route.routeElapsedMinutes).toBeCloseTo(5.2);
    expect(interrupted.events).toEqual([
      {
        type: 'route.checkpoint',
        eventId: 'route-event:docks-checkpoint',
        hookId: 'checkpoint.customs-light',
        checkpointId: 'customs-light',
      },
    ]);
    expect(interrupted.paused?.type).toBe('route.checkpoint');

    const held = flow.step(1);

    expect(held.snapshot.route.routeElapsedMinutes).toBeCloseTo(5.2);
    expect(held.events).toEqual([]);

    flow.resolvePausedEvent({ type: 'continue' });
    const arrived = flow.step(1.4);

    expect(arrived.snapshot.route.state.status).toBe('arrived');
  });

  it('lets annotation events pass without pausing ride flow', () => {
    const experience = createRouteExperienceFixture() as {
      events: Array<{
        behavior: unknown;
      }>;
    };

    experience.events[0] = {
      behavior: {
        type: 'annotation',
        annotationId: 'docks.customs-ahead',
      },
      eventId: 'route-event:docks-checkpoint',
    } as {
      behavior: unknown;
    };

    const flow = new RouteFlowController(
      entityId('route', 'docks-night'),
      createWorldFixture(),
      createRouteMotionFixture(),
      experience,
      {
        gameMinutesPerRealSecond: 2,
      },
    );

    const result = flow.step(3);

    expect(result.paused).toBeNull();
    expect(result.snapshot.route.routeElapsedMinutes).toBe(6);
    expect(result.events[0]?.type).toBe('route.annotation');
  });

  it('branches to an authored diversion only after resolving a decision', () => {
    const fixture = createBranchingRouteFlowFixture();
    const flow = new RouteFlowController(
      entityId('route', 'docks-main'),
      fixture.world,
      fixture.motion,
      fixture.experience,
      {
        gameMinutesPerRealSecond: 2,
      },
    );

    const decision = flow.step(3);

    expect(decision.consumedSeconds).toBe(2);
    expect(decision.paused?.type).toBe('route.decision');
    expect(decision.snapshot.route.routeElapsedMinutes).toBe(4);

    const diverted = flow.resolvePausedEvent({
      type: 'choose',
      choiceId: 'take-service-road',
    });

    expect(diverted.route.state.routeId).toBe('route:docks-diversion');
    expect(diverted.route.routeProgress).toBe(0);

    const arrived = flow.step(2);

    expect(arrived.snapshot.route.state.status).toBe('arrived');
    expect(arrived.snapshot.route.state.routeId).toBe(
      'route:docks-diversion',
    );
  });
});
