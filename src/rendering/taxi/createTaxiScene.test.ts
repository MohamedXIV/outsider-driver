import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createTaxiScene } from './createTaxiScene';

describe('createTaxiScene', () => {
  it('creates explicit reusable taxi, world, passenger, and dashboard anchors', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);

    expect(taxi.scene.activeCamera).toBe(taxi.camera);
    expect(taxi.camera.parent).toBe(taxi.taxiMotionRoot);
    expect(taxi.interiorRoot.parent).toBe(taxi.taxiMotionRoot);
    expect(taxi.worldRoot.parent).toBeNull();

    expect(taxi.anchors.passengerSeat.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.passengerLighting.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.radio.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.navigation.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.translator.parent).toBe(taxi.interiorRoot);
    expect(taxi.cabinLight.parent).toBe(taxi.anchors.passengerLighting);

    taxi.scene.render();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('builds presentation assets from the validated scene definition', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);

    for (const asset of defaultTaxiSceneDefinition.assets) {
      expect(taxi.scene.getMeshByName(`taxi-asset-${asset.id}`)).not.toBeNull();
    }

    taxi.scene.dispose();
    engine.dispose();
  });
});
