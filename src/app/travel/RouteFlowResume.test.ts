import { describe, expect, it } from 'vitest';
import { createRouteExperienceFixture } from '../../content/routes/fixtures/routeExperienceFixture';
import { createRouteMotionFixture } from '../../content/routes/fixtures/routeMotionFixture';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import { entityId } from '../../domain/ids/EntityId';
import { RouteFlowController } from './RouteFlowController';

describe('RouteFlowController resume', () => {
  it('round-trips a paused checkpoint without refiring it', () => {
    const world = createWorldFixture();
    const motion = createRouteMotionFixture();
    const experience = createRouteExperienceFixture();
    const config = {
      gameMinutesPerRealSecond: 2,
    };

    const original = new RouteFlowController(
      entityId('route', 'docks-night'),
      world,
      motion,
      experience,
      config,
    );

    const paused = original.step(3);
    expect(paused.paused?.type).toBe('route.checkpoint');

    const serialized = JSON.stringify(original.exportState());
    const restored = RouteFlowController.fromState(
      JSON.parse(serialized) as unknown,
      world,
      motion,
      experience,
      config,
    );

    expect(restored.getPausedEvent()).toEqual(paused.paused);
    expect(restored.getSnapshot().route.routeElapsedMinutes).toBeCloseTo(
      5.2,
    );

    restored.resolvePausedEvent({ type: 'continue' });
    const arrived = restored.step(1.4);

    expect(arrived.events).toEqual([]);
    expect(arrived.snapshot.route.state.status).toBe('arrived');
  });
});
