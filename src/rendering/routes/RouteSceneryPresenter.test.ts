import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { productionContent } from '../../content/production/ProductionContent';
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

  it('builds the authored Outer Margin shop facade beside the completed roadside stop', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const presenter = new RouteSceneryPresenter(
      taxi,
      productionContent.world,
      productionContent.routeExperience,
    );

    presenter.showSegment(
      entityId('route-segment', 'outer-margin-patchworks-approach'),
      { daylightFactor: 0.1, precipitation: 0 },
    );
    const sign = taxi.scene.getMeshByName('route-scenery-patchworks-illuminated-sign');
    expect(sign).not.toBeNull();
    expect(taxi.scene.getMeshByName('route-scenery-patchworks-salvage-parts-stand'))
      .not.toBeNull();
    expect(taxi.scene.getMeshByName('route-scenery-patchworks-roadside-stop-marker'))
      .not.toBeNull();
    presenter.setProgress(1);
    expect(presenter.getRoot().position.z).toBe(-54);
    // Shop is ahead/right of the parked cab rather than behind its camera.
    expect(sign?.position.z).toBeGreaterThan(54);
    expect(sign?.getAbsolutePosition().z).toBeGreaterThan(0);
    expect(taxi.scene.fogDensity).toBeCloseTo(0.012);

    presenter.dispose();
    expect(taxi.scene.getMeshByName('route-scenery-patchworks-illuminated-sign'))
      .toBeNull();
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
