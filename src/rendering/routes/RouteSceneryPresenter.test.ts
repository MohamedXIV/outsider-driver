import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createRouteExperienceFixture } from '../../content/routes/fixtures/routeExperienceFixture';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import { entityId } from '../../domain/ids/EntityId';
import { createTaxiScene } from '../taxi/createTaxiScene';
import { RouteSceneryPresenter } from './RouteSceneryPresenter';

describe('RouteSceneryPresenter', () => {
  it('builds modular segment scenery under worldRoot and advances it from route progress', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const presenter = new RouteSceneryPresenter(
      taxi,
      createWorldFixture(),
      createRouteExperienceFixture(),
    );
    const taxiBodyStart = taxi.taxiMotionRoot.position.clone();

    presenter.showSegment(
      entityId('route-segment', 'docks-night-01'),
      {
        daylightFactor: 0,
        precipitation: 1,
      },
    );

    expect(presenter.getRoot().parent).toBe(taxi.worldRoot);
    expect(
      taxi.scene.getMeshByName('route-scenery-dock-wall-left'),
    ).not.toBeNull();
    expect(
      taxi.scene.getMeshByName('route-scenery-dock-overhead-marker'),
    ).not.toBeNull();

    presenter.setProgress(0.5);

    expect(presenter.getRoot().position.z).toBe(-18);
    expect(taxi.taxiMotionRoot.position.equals(taxiBodyStart)).toBe(true);
    expect(taxi.ambientLight.intensity).toBeCloseTo(
      0.62 * 0.82 * 0.72,
    );
    expect(taxi.scene.fogDensity).toBeCloseTo(0.016);

    presenter.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('requires a segment before progress can drive presentation', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const presenter = new RouteSceneryPresenter(
      taxi,
      createWorldFixture(),
      createRouteExperienceFixture(),
    );

    expect(() => {
      presenter.setProgress(0.5);
    }).toThrow(/before showing a segment/);

    presenter.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });
});
