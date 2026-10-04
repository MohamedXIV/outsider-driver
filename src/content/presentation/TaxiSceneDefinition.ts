import * as z from 'zod';

export const TAXI_SCENE_SCHEMA_VERSION = 1 as const;

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
const positiveVector3Schema = z.tuple([
  z.number().positive(),
  z.number().positive(),
  z.number().positive(),
]);
const normalizedColorSchema = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
]);
const presentationIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const LocalTransformSchema = z
  .object({
    position: vector3Schema,
    rotation: vector3Schema,
    scale: positiveVector3Schema.default([1, 1, 1]),
  })
  .strict();

export const TaxiSceneDefinitionSchema = z
  .object({
    schemaVersion: z.literal(TAXI_SCENE_SCHEMA_VERSION),
    camera: z
      .object({
        transform: LocalTransformSchema,
        fovRadians: z.number().positive().max(Math.PI),
        minZ: z.number().positive(),
        maxZ: z.number().positive(),
      })
      .strict()
      .refine((camera) => camera.maxZ > camera.minZ, {
        message: 'Camera maxZ must be greater than minZ.',
        path: ['maxZ'],
      }),
    anchors: z
      .object({
        passengerSeat: LocalTransformSchema,
        passengerLighting: LocalTransformSchema,
        radio: LocalTransformSchema,
        navigation: LocalTransformSchema,
        translator: LocalTransformSchema,
      })
      .strict(),
    lighting: z
      .object({
        ambientDirection: vector3Schema,
        ambientColor: normalizedColorSchema,
        ambientIntensity: z.number().min(0),
        cabinColor: normalizedColorSchema,
        cabinIntensity: z.number().min(0),
      })
      .strict(),
    environment: z
      .object({
        clearColor: z.tuple([
          z.number().min(0).max(1),
          z.number().min(0).max(1),
          z.number().min(0).max(1),
          z.number().min(0).max(1),
        ]),
      })
      .strict(),
    assets: z.array(
      z
        .object({
          id: presentationIdSchema,
          kind: z.literal('box'),
          space: z.enum(['taxi-interior', 'world']),
          size: positiveVector3Schema,
          transform: LocalTransformSchema,
          material: z
            .object({
              diffuseColor: normalizedColorSchema,
              emissiveColor: normalizedColorSchema.default([0, 0, 0]),
            })
            .strict(),
        })
        .strict(),
    ),
  })
  .strict()
  .refine(
    (definition) =>
      new Set(definition.assets.map((asset) => asset.id)).size ===
      definition.assets.length,
    {
      message: 'Taxi scene asset IDs must be unique.',
      path: ['assets'],
    },
  );

export type LocalTransform = z.infer<typeof LocalTransformSchema>;
export type TaxiSceneDefinition = z.infer<typeof TaxiSceneDefinitionSchema>;
