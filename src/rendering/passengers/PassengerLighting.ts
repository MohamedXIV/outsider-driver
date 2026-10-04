import * as z from 'zod';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TaxiSceneHandle } from '../taxi/createTaxiScene';

const colorSchema = z.tuple([
  z.number().min(0),
  z.number().min(0),
  z.number().min(0),
]);
const directionSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
]);

export const PassengerAccentLightKindSchema = z.enum([
  'neon',
  'headlights',
  'emergency',
]);

export type PassengerAccentLightKind = z.infer<
  typeof PassengerAccentLightKindSchema
>;

export const PassengerAccentLightSchema = z
  .object({
    kind: PassengerAccentLightKindSchema,
    color: colorSchema,
    intensity: z.number().min(0).max(10),
    direction: directionSchema,
  })
  .strict();

export type PassengerAccentLight = z.infer<
  typeof PassengerAccentLightSchema
>;

export const PassengerLightingContextSchema = z
  .object({
    darkness: z.number().min(0).max(1).default(0),
    accents: z.array(PassengerAccentLightSchema).default([]),
  })
  .strict();

export type PassengerLightingContext = z.infer<
  typeof PassengerLightingContextSchema
>;

export interface PassengerLightingState {
  readonly ambientColor: readonly [number, number, number];
  readonly ambientIntensity: number;
  readonly keyColor: readonly [number, number, number];
  readonly keyIntensity: number;
  readonly keyDirection: readonly [number, number, number];
  readonly accentColor: readonly [number, number, number];
  readonly accentIntensity: number;
  readonly accentDirection: readonly [number, number, number];
}

export interface PassengerLightingSink {
  setLighting(state: PassengerLightingState): void;
}

function colorTuple(
  red: number,
  green: number,
  blue: number,
): readonly [number, number, number] {
  return [red, green, blue];
}

function normalizedDirection(
  input: readonly [number, number, number],
): readonly [number, number, number] {
  const vector = new Vector3(input[0], input[1], input[2]);

  if (vector.lengthSquared() <= 1e-8) {
    return [0, 0, 1];
  }

  vector.normalize();
  return [vector.x, vector.y, vector.z];
}

function passengerLocalCabinDirection(
  taxi: TaxiSceneHandle,
): readonly [number, number, number] {
  taxi.anchors.passengerSeat.computeWorldMatrix(true);
  taxi.anchors.passengerLighting.computeWorldMatrix(true);

  const seatWorld = taxi.anchors.passengerSeat.getWorldMatrix();
  const lightWorldPosition =
    taxi.anchors.passengerLighting.getAbsolutePosition();
  const inverseSeat = Matrix.Invert(seatWorld);
  const localLightPosition = Vector3.TransformCoordinates(
    lightWorldPosition,
    inverseSeat,
  );

  return normalizedDirection([
    localLightPosition.x,
    localLightPosition.y,
    localLightPosition.z,
  ]);
}

function aggregateAccents(
  accents: readonly PassengerAccentLight[],
): Pick<
  PassengerLightingState,
  'accentColor' | 'accentIntensity' | 'accentDirection'
> {
  if (accents.length === 0) {
    return {
      accentColor: [0, 0, 0],
      accentIntensity: 0,
      accentDirection: [0, 0, 1],
    };
  }

  let totalIntensity = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  const direction = Vector3.Zero();

  for (const accent of accents) {
    totalIntensity += accent.intensity;
    red += accent.color[0] * accent.intensity;
    green += accent.color[1] * accent.intensity;
    blue += accent.color[2] * accent.intensity;

    const normalized = normalizedDirection(accent.direction);
    direction.addInPlace(
      new Vector3(
        normalized[0],
        normalized[1],
        normalized[2],
      ).scale(accent.intensity),
    );
  }

  const safeIntensity = Math.max(totalIntensity, 1e-8);
  const accentDirection =
    direction.lengthSquared() <= 1e-8
      ? ([0, 0, 1] as const)
      : normalizedDirection([
          direction.x,
          direction.y,
          direction.z,
        ]);

  return {
    accentColor: colorTuple(
      red / safeIntensity,
      green / safeIntensity,
      blue / safeIntensity,
    ),
    accentIntensity: totalIntensity,
    accentDirection,
  };
}

export function resolvePassengerLighting(
  taxi: TaxiSceneHandle,
  contextInput: unknown = {},
): PassengerLightingState {
  const context =
    PassengerLightingContextSchema.parse(contextInput);
  const visibility = 1 - context.darkness;
  const accents = aggregateAccents(context.accents);

  return {
    ambientColor: colorTuple(
      taxi.ambientLight.diffuse.r,
      taxi.ambientLight.diffuse.g,
      taxi.ambientLight.diffuse.b,
    ),
    ambientIntensity:
      taxi.ambientLight.intensity * visibility,
    keyColor: colorTuple(
      taxi.cabinLight.diffuse.r,
      taxi.cabinLight.diffuse.g,
      taxi.cabinLight.diffuse.b,
    ),
    keyIntensity:
      taxi.cabinLight.intensity * visibility,
    keyDirection:
      passengerLocalCabinDirection(taxi),
    ...accents,
  };
}

export class PassengerLightingBridge {
  readonly #taxi: TaxiSceneHandle;
  readonly #sink: PassengerLightingSink;

  public constructor(
    taxi: TaxiSceneHandle,
    sink: PassengerLightingSink,
  ) {
    this.#taxi = taxi;
    this.#sink = sink;
  }

  public sync(
    context: unknown = {},
  ): PassengerLightingState {
    const state = resolvePassengerLighting(
      this.#taxi,
      context,
    );
    this.#sink.setLighting(state);
    return state;
  }
}
