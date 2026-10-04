import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createVehicleDynamicsState } from '../../domain/vehicle/VehicleDynamics';
import { createTaxiScene } from './createTaxiScene';
import { TaxiMotionPresenter } from './TaxiMotionPresenter';

describe('TaxiMotionPresenter', () => {
  it('applies body and camera response without steering/yaw ownership', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const presenter = new TaxiMotionPresenter(taxi);
    const initialYaw = taxi.taxiMotionRoot.rotation.y;

    presenter.apply({
      ...createVehicleDynamicsState(),
      bodyPitchRadians: 0.03,
      bodyRollRadians: -0.04,
      bodyVerticalOffsetMeters: 0.01,
      cameraPitchRadians: 0.012,
      cameraRollRadians: -0.008,
      cameraVerticalOffsetMeters: 0.004,
    });

    expect(taxi.taxiMotionRoot.position.y).toBe(0.01);
    expect(taxi.taxiMotionRoot.rotation.x).toBe(0.03);
    expect(taxi.taxiMotionRoot.rotation.z).toBe(-0.04);
    expect(taxi.taxiMotionRoot.rotation.y).toBe(initialYaw);
    expect(taxi.cameraMotionRoot.rotation.x).toBe(0.012);
    expect(taxi.worldRoot.position.y).toBe(0);

    taxi.scene.dispose();
    engine.dispose();
  });
});
