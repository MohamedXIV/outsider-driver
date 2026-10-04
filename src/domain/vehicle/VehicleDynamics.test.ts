import { describe, expect, it } from 'vitest';
import {
  createVehicleDynamicsState,
  defaultVehicleDynamicsParameters,
  stepVehicleDynamics,
} from './VehicleDynamics';

describe('VehicleDynamics', () => {
  it('accelerates toward authored speed and pitches under acceleration', () => {
    const next = stepVehicleDynamics(
      createVehicleDynamicsState(),
      {
        progress: 0.2,
        targetSpeedMps: 12,
        curvature: 0,
        surfaceRoughness: 0.1,
      },
      defaultVehicleDynamicsParameters,
      0.5,
    );

    expect(next.speedMps).toBeGreaterThan(0);
    expect(next.accelerationMps2).toBeGreaterThan(0);
    expect(next.bodyPitchRadians).toBeLessThan(0);
  });

  it('rolls from curvature and emits deterministic road/suspension motion', () => {
    const next = stepVehicleDynamics(
      {
        ...createVehicleDynamicsState(),
        speedMps: 10,
      },
      {
        progress: 0.7,
        targetSpeedMps: 10,
        curvature: -0.6,
        surfaceRoughness: 0.8,
      },
      defaultVehicleDynamicsParameters,
      0.1,
    );

    expect(next.bodyRollRadians).toBeGreaterThan(0);
    expect(next.bodyVerticalOffsetMeters).not.toBe(0);
    expect(next.secondaryMotion.verticalMeters).not.toBe(0);
  });

  it('responds to braking without owning route state', () => {
    const moving = {
      ...createVehicleDynamicsState(),
      speedMps: 8,
    };
    const braking = stepVehicleDynamics(
      moving,
      {
        progress: 1,
        targetSpeedMps: 0,
        curvature: 0,
        surfaceRoughness: 0,
      },
      defaultVehicleDynamicsParameters,
      0.5,
    );

    expect(braking.speedMps).toBeLessThan(moving.speedMps);
    expect(braking.accelerationMps2).toBeLessThan(0);
    expect(braking.bodyPitchRadians).toBeGreaterThan(0);
  });
});
