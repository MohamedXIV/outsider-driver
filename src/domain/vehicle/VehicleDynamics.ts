import * as z from 'zod';
import { RouteMotionSampleSchema } from '../../content/routes/RouteMotionProfiles';

const TAU = Math.PI * 2;

export const VehicleDynamicsParametersSchema = z
  .object({
    maxAccelerationMps2: z.number().positive(),
    maxBrakingMps2: z.number().positive(),
    pitchPerAcceleration: z.number().min(0),
    maxPitchRadians: z.number().min(0),
    rollPerCurvatureSpeedSquared: z.number().min(0),
    maxRollRadians: z.number().min(0),
    bodyResponsePerSecond: z.number().positive(),
    suspensionBobAmplitudeMeters: z.number().min(0),
    suspensionBobFrequencyHz: z.number().positive(),
    vibrationAmplitudeMeters: z.number().min(0),
    vibrationFrequencyHz: z.number().positive(),
    cameraPitchScale: z.number().min(0),
    cameraRollScale: z.number().min(0),
    cameraVerticalScale: z.number().min(0),
    secondaryMotionScale: z.number().min(0),
  })
  .strict();

export type VehicleDynamicsParameters = z.infer<
  typeof VehicleDynamicsParametersSchema
>;

export const defaultVehicleDynamicsParameters: VehicleDynamicsParameters =
  VehicleDynamicsParametersSchema.parse({
    maxAccelerationMps2: 2.4,
    maxBrakingMps2: 4.2,
    pitchPerAcceleration: 0.018,
    maxPitchRadians: 0.065,
    rollPerCurvatureSpeedSquared: 0.00085,
    maxRollRadians: 0.09,
    bodyResponsePerSecond: 5.5,
    suspensionBobAmplitudeMeters: 0.012,
    suspensionBobFrequencyHz: 1.4,
    vibrationAmplitudeMeters: 0.008,
    vibrationFrequencyHz: 9.5,
    cameraPitchScale: 0.45,
    cameraRollScale: 0.32,
    cameraVerticalScale: 0.55,
    secondaryMotionScale: 1.35,
  });

export interface InteriorSecondaryMotionSignal {
  readonly verticalMeters: number;
  readonly pitchRadians: number;
  readonly rollRadians: number;
}

export interface VehicleDynamicsState {
  readonly elapsedSeconds: number;
  readonly speedMps: number;
  readonly accelerationMps2: number;
  readonly bodyPitchRadians: number;
  readonly bodyRollRadians: number;
  readonly bodyVerticalOffsetMeters: number;
  readonly cameraPitchRadians: number;
  readonly cameraRollRadians: number;
  readonly cameraVerticalOffsetMeters: number;
  readonly secondaryMotion: InteriorSecondaryMotionSignal;
}

export function createVehicleDynamicsState(): VehicleDynamicsState {
  return {
    elapsedSeconds: 0,
    speedMps: 0,
    accelerationMps2: 0,
    bodyPitchRadians: 0,
    bodyRollRadians: 0,
    bodyVerticalOffsetMeters: 0,
    cameraPitchRadians: 0,
    cameraRollRadians: 0,
    cameraVerticalOffsetMeters: 0,
    secondaryMotion: {
      verticalMeters: 0,
      pitchRadians: 0,
      rollRadians: 0,
    },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function approach(
  current: number,
  target: number,
  increasePerSecond: number,
  decreasePerSecond: number,
  deltaSeconds: number,
): number {
  const delta = target - current;
  const rate = delta >= 0 ? increasePerSecond : decreasePerSecond;
  const maximumChange = rate * deltaSeconds;

  if (Math.abs(delta) <= maximumChange) {
    return target;
  }

  return current + Math.sign(delta) * maximumChange;
}

function smooth(
  current: number,
  target: number,
  responsePerSecond: number,
  deltaSeconds: number,
): number {
  const amount = 1 - Math.exp(-responsePerSecond * deltaSeconds);
  return current + (target - current) * amount;
}

export function stepVehicleDynamics(
  previous: VehicleDynamicsState,
  motionInput: unknown,
  parameterInput: VehicleDynamicsParameters,
  deltaSeconds: number,
): VehicleDynamicsState {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('Dynamics delta must be a finite non-negative number.');
  }

  if (deltaSeconds === 0) {
    return previous;
  }

  const motion = RouteMotionSampleSchema.parse(motionInput);
  const parameters = VehicleDynamicsParametersSchema.parse(parameterInput);
  const speedMps = approach(
    previous.speedMps,
    motion.targetSpeedMps,
    parameters.maxAccelerationMps2,
    parameters.maxBrakingMps2,
    deltaSeconds,
  );
  const accelerationMps2 = (speedMps - previous.speedMps) / deltaSeconds;

  const pitchTarget = clamp(
    -accelerationMps2 * parameters.pitchPerAcceleration,
    -parameters.maxPitchRadians,
    parameters.maxPitchRadians,
  );
  const rollTarget = clamp(
    -motion.curvature *
      speedMps *
      speedMps *
      parameters.rollPerCurvatureSpeedSquared,
    -parameters.maxRollRadians,
    parameters.maxRollRadians,
  );

  const bodyPitchRadians = smooth(
    previous.bodyPitchRadians,
    pitchTarget,
    parameters.bodyResponsePerSecond,
    deltaSeconds,
  );
  const bodyRollRadians = smooth(
    previous.bodyRollRadians,
    rollTarget,
    parameters.bodyResponsePerSecond,
    deltaSeconds,
  );

  const elapsedSeconds = previous.elapsedSeconds + deltaSeconds;
  const speedFactor = clamp(speedMps / 12, 0, 1);
  const bob =
    Math.sin(
      elapsedSeconds * TAU * parameters.suspensionBobFrequencyHz,
    ) *
    parameters.suspensionBobAmplitudeMeters *
    speedFactor;
  const vibration =
    Math.sin(elapsedSeconds * TAU * parameters.vibrationFrequencyHz) *
    parameters.vibrationAmplitudeMeters *
    motion.surfaceRoughness *
    speedFactor;
  const bodyVerticalOffsetMeters = bob + vibration;

  return {
    elapsedSeconds,
    speedMps,
    accelerationMps2,
    bodyPitchRadians,
    bodyRollRadians,
    bodyVerticalOffsetMeters,
    cameraPitchRadians: bodyPitchRadians * parameters.cameraPitchScale,
    cameraRollRadians: bodyRollRadians * parameters.cameraRollScale,
    cameraVerticalOffsetMeters:
      bodyVerticalOffsetMeters * parameters.cameraVerticalScale,
    secondaryMotion: {
      verticalMeters:
        bodyVerticalOffsetMeters * parameters.secondaryMotionScale,
      pitchRadians: bodyPitchRadians * parameters.secondaryMotionScale,
      rollRadians: bodyRollRadians * parameters.secondaryMotionScale,
    },
  };
}
