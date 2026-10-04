import { describe, expect, it } from 'vitest';
import { createRouteMotionFixture } from '../../content/routes/fixtures/routeMotionFixture';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import { entityId } from '../../domain/ids/EntityId';
import { TaxiAutopilotController } from './TaxiAutopilotController';

const routeId = entityId('route', 'docks-night');

function createController(): TaxiAutopilotController {
  return new TaxiAutopilotController(
    routeId,
    createWorldFixture(),
    createRouteMotionFixture(),
    {
      gameMinutesPerRealSecond: 2,
    },
  );
}

describe('TaxiAutopilotController', () => {
  it('drives an authored route automatically from start to finish', () => {
    const controller = createController();

    const first = controller.step(1);
    expect(first.route.routeProgress).toBe(0.25);
    expect(first.route.state.status).toBe('travelling');
    expect(first.dynamics.speedMps).toBeGreaterThan(0);

    controller.step(1);
    controller.step(1);
    const arrived = controller.step(1);

    expect(arrived.route.state.status).toBe('arrived');
    expect(arrived.route.routeProgress).toBe(1);
  });

  it('is deterministic for an identical input sequence', () => {
    const first = createController();
    const second = createController();
    const deltas = [0.25, 0.5, 0.75, 0.4, 0.6];

    const firstSnapshots = deltas.map((delta) => first.step(delta));
    const secondSnapshots = deltas.map((delta) => second.step(delta));

    expect(firstSnapshots).toEqual(secondSnapshots);
  });
});
