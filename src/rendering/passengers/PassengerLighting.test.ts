import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { entityId } from '../../domain/ids/EntityId';
import { RouteSceneryPresenter } from '../routes/RouteSceneryPresenter';
import { createTaxiScene } from '../taxi/createTaxiScene';
import {
  PassengerLightingBridge,
  resolvePassengerLighting,
  type PassengerLightingState,
} from './PassengerLighting';

describe('PassengerLightingBridge', () => {
  it('samples the real taxi ambient/cabin lights and passenger-local key direction', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(
      engine,
      productionContent.taxiScene,
    );

    const state = resolvePassengerLighting(taxi);

    expect(state.ambientColor).toEqual([0.28, 0.34, 0.48]);
    expect(state.ambientIntensity).toBeCloseTo(0.55);
    expect(state.keyColor).toEqual([0.95, 0.42, 0.18]);
    expect(state.keyIntensity).toBeCloseTo(1.3);
    expect(
      Math.hypot(...state.keyDirection),
    ).toBeCloseTo(1);

    taxi.scene.dispose();
    engine.dispose();
  });

  it('inherits current route day/night/weather ambient lighting rather than duplicating environment truth', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(
      engine,
      productionContent.taxiScene,
    );
    const scenery = new RouteSceneryPresenter(
      taxi,
      productionContent.world,
      productionContent.routeExperience,
    );

    scenery.showSegment(
      entityId('route-segment', 'docks-night-01'),
      {
        daylightFactor: 0,
        precipitation: 1,
      },
    );

    const state = resolvePassengerLighting(taxi);
    const profile =
      productionContent.routeExperience.districtVisuals[0];

    expect(state.ambientColor).toEqual(profile.ambientColor);
    expect(state.ambientIntensity).toBeCloseTo(
      profile.ambientIntensity *
        profile.nightAmbientMultiplier *
        profile.precipitationAmbientMultiplier,
    );

    scenery.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('keeps headlights as a first-class transient accent source', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(
      engine,
      productionContent.taxiScene,
    );

    const state = resolvePassengerLighting(taxi, {
      accents: [
        {
          kind: 'headlights',
          color: [0.9, 0.95, 1],
          intensity: 1.4,
          direction: [0.1, -0.2, 1],
        },
      ],
    });

    expect(state.accentColor).toEqual([0.9, 0.95, 1]);
    expect(state.accentIntensity).toBeCloseTo(1.4);
    expect(
      Math.hypot(...state.accentDirection),
    ).toBeCloseTo(1);

    taxi.scene.dispose();
    engine.dispose();
  });

  it('can attenuate cabin/world light for tunnels while retaining transient neon/emergency light', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(
      engine,
      productionContent.taxiScene,
    );
    const captured: PassengerLightingState[] = [];
    const bridge = new PassengerLightingBridge(taxi, {
      setLighting: (state) => {
        captured.push(state);
      },
    });

    const state = bridge.sync({
      darkness: 1,
      accents: [
        {
          kind: 'neon',
          color: [0.2, 0.4, 1],
          intensity: 0.8,
          direction: [-1, 0.2, 0.5],
        },
        {
          kind: 'emergency',
          color: [1, 0.05, 0.02],
          intensity: 1.2,
          direction: [1, 0.1, 0.4],
        },
      ],
    });

    expect(state.ambientIntensity).toBe(0);
    expect(state.keyIntensity).toBe(0);
    expect(state.accentIntensity).toBeCloseTo(2);
    expect(state.accentColor).toEqual([
      (0.2 * 0.8 + 1 * 1.2) / 2,
      (0.4 * 0.8 + 0.05 * 1.2) / 2,
      (1 * 0.8 + 0.02 * 1.2) / 2,
    ]);
    expect(captured).toEqual([state]);

    taxi.scene.dispose();
    engine.dispose();
  });
});
