import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createVehicleDynamicsState } from '../../domain/vehicle/VehicleDynamics';
import { createTaxiScene } from './createTaxiScene';
import { TaxiMotionPresenter } from './TaxiMotionPresenter';

function motionState() {
  return {
    ...createVehicleDynamicsState(),
    speedMps: 9,
    accelerationMps2: 1.2,
    bodyPitchRadians: 0.03,
    bodyRollRadians: -0.04,
    bodyVerticalOffsetMeters: 0.01,
    cameraPitchRadians: 0.012,
    cameraRollRadians: -0.008,
    cameraVerticalOffsetMeters: 0.004,
  };
}

describe('TaxiMotionPresenter', () => {
  it('applies body and camera response without steering/yaw ownership', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const presenter = new TaxiMotionPresenter(taxi);
    const initialYaw = taxi.taxiMotionRoot.rotation.y;

    presenter.apply(motionState());

    expect(taxi.taxiMotionRoot.position.y).toBe(0.01);
    expect(taxi.taxiMotionRoot.rotation.x).toBe(0.03);
    expect(taxi.taxiMotionRoot.rotation.z).toBe(-0.04);
    expect(taxi.taxiMotionRoot.rotation.y).toBe(initialYaw);
    expect(taxi.cameraMotionRoot.rotation.x).toBe(0.012);
    expect(taxi.worldRoot.position.y).toBe(0);

    taxi.scene.dispose();
    engine.dispose();
  });

  it('attenuates only presentation transforms while leaving the authoritative dynamics state unchanged', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    let intensity = 0.25;
    const presenter = new TaxiMotionPresenter(taxi, {
      getMotionIntensity: () => intensity,
    });
    const state = motionState();
    const snapshot = structuredClone(state);

    presenter.apply(state);

    expect(taxi.taxiMotionRoot.position.y).toBeCloseTo(0.0025);
    expect(taxi.taxiMotionRoot.rotation.x).toBeCloseTo(0.0075);
    expect(taxi.cameraMotionRoot.rotation.z).toBeCloseTo(-0.002);
    expect(state).toEqual(snapshot);
    expect(state.speedMps).toBe(9);

    intensity = 0;
    presenter.apply(state);

    expect(taxi.taxiMotionRoot.position.y).toBe(0);
    expect(taxi.taxiMotionRoot.rotation.x).toBe(0);
    expect(taxi.cameraMotionRoot.rotation.z).toBe(0);
    expect(state).toEqual(snapshot);

    taxi.scene.dispose();
    engine.dispose();
  });
});
