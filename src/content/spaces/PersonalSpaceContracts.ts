import * as z from 'zod';
import {
  LocalTransformSchema,
  type LocalTransform,
} from '../presentation/TaxiSceneDefinition';
import { entityIdSchema } from '../../domain/ids/EntityId';

export const PERSONAL_SPACE_CATALOG_SCHEMA_VERSION = 1 as const;

const stableLocalIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const vector3Schema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
]);

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

const PersonalSpaceFlagSchema = z
  .object({
    id: stableLocalIdSchema,
    defaultValue: z.boolean(),
  })
  .strict();

const AssetVisibilitySchema = z
  .object({
    flagId: stableLocalIdSchema,
    visibleWhen: z.boolean(),
  })
  .strict();

export const PersonalSpaceAssetSchema = z
  .object({
    id: stableLocalIdSchema,
    kind: z.literal('box'),
    size: positiveVector3Schema,
    transform: LocalTransformSchema,
    collidable: z.boolean(),
    visibility: AssetVisibilitySchema.nullable(),
    material: z
      .object({
        diffuseColor: normalizedColorSchema,
        emissiveColor: normalizedColorSchema.default([0, 0, 0]),
      })
      .strict(),
  })
  .strict();

export const PersonalSpaceInteractionKindSchema = z.enum([
  'taxi-access',
  'messages',
  'possessions',
  'upgrades',
  'sleep',
  'exit',
]);

export type PersonalSpaceInteractionKind = z.infer<
  typeof PersonalSpaceInteractionKindSchema
>;

export const PersonalSpaceInteractionAnchorSchema = z
  .object({
    id: stableLocalIdSchema,
    kind: PersonalSpaceInteractionKindSchema,
    transform: LocalTransformSchema,
    interactionRadius: z.number().positive(),
  })
  .strict();

export const PersonalSpaceDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: entityIdSchema('personal-space'),
    kind: z.enum(['garage', 'home']),
    displayName: z.string().trim().min(1).max(120),
    camera: z
      .object({
        spawn: LocalTransformSchema,
        fovRadians: z.number().positive().max(Math.PI),
        minZ: z.number().positive(),
        maxZ: z.number().positive(),
        movementSpeed: z.number().positive(),
        angularSensibility: z.number().positive(),
        bounds: z
          .object({
            min: vector3Schema,
            max: vector3Schema,
          })
          .strict()
          .refine(
            (bounds) =>
              bounds.max[0] > bounds.min[0] &&
              bounds.max[1] > bounds.min[1] &&
              bounds.max[2] > bounds.min[2],
            {
              message:
                'Personal space camera bounds max must exceed min on every axis.',
              path: ['max'],
            },
          ),
      })
      .strict()
      .refine((camera) => camera.maxZ > camera.minZ, {
        message: 'Camera maxZ must be greater than minZ.',
        path: ['maxZ'],
      }),
    lighting: z
      .object({
        ambientDirection: vector3Schema,
        ambientColor: normalizedColorSchema,
        ambientIntensity: z.number().min(0),
        practicalLights: z.array(
          z
            .object({
              id: stableLocalIdSchema,
              transform: LocalTransformSchema,
              color: normalizedColorSchema,
              intensity: z.number().min(0),
              range: z.number().positive(),
            })
            .strict(),
        ),
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
    flags: z.array(PersonalSpaceFlagSchema),
    assets: z.array(PersonalSpaceAssetSchema),
    interactionAnchors: z.array(PersonalSpaceInteractionAnchorSchema),
  })
  .strict()
  .superRefine((definition, context) => {
    const requireUnique = (
      values: readonly string[],
      label: string,
      path: string,
    ) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: 'custom',
          message: `Personal space ${label} IDs must be unique.`,
          path: [path],
        });
      }
    };

    requireUnique(
      definition.flags.map((flag) => flag.id),
      'flag',
      'flags',
    );
    requireUnique(
      definition.assets.map((asset) => asset.id),
      'asset',
      'assets',
    );
    requireUnique(
      definition.interactionAnchors.map((anchor) => anchor.id),
      'interaction anchor',
      'interactionAnchors',
    );
    requireUnique(
      definition.lighting.practicalLights.map((light) => light.id),
      'practical light',
      'lighting',
    );

    const flagIds = new Set(definition.flags.map((flag) => flag.id));

    for (const [index, asset] of definition.assets.entries()) {
      if (
        asset.visibility !== null &&
        !flagIds.has(asset.visibility.flagId)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            `Asset ${asset.id} references unknown visibility flag ${asset.visibility.flagId}.`,
          path: ['assets', index, 'visibility', 'flagId'],
        });
      }
    }
  });

export const PersonalSpaceCatalogSchema = z
  .object({
    schemaVersion: z.literal(PERSONAL_SPACE_CATALOG_SCHEMA_VERSION),
    spaces: z.array(PersonalSpaceDefinitionSchema).min(2),
  })
  .strict()
  .superRefine((catalog, context) => {
    if (
      new Set(catalog.spaces.map((space) => space.id)).size !==
      catalog.spaces.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Personal space IDs must be unique.',
        path: ['spaces'],
      });
    }

    const kinds = new Set(catalog.spaces.map((space) => space.kind));

    for (const requiredKind of ['garage', 'home'] as const) {
      if (!kinds.has(requiredKind)) {
        context.addIssue({
          code: 'custom',
          message:
            `Production personal spaces require at least one ${requiredKind} definition.`,
          path: ['spaces'],
        });
      }
    }
  });

export type PersonalSpaceDefinition = z.infer<
  typeof PersonalSpaceDefinitionSchema
>;
export type PersonalSpaceCatalog = z.infer<
  typeof PersonalSpaceCatalogSchema
>;
export type PersonalSpaceLocalTransform = LocalTransform;

export function validatePersonalSpaceCatalog(
  input: unknown,
): PersonalSpaceCatalog {
  return PersonalSpaceCatalogSchema.parse(input);
}
