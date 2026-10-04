import * as z from 'zod';
import { entityIdSchema } from '../../domain/ids/EntityId';
import { validateWorldContentCatalog } from '../world/WorldContracts';

export const ROUTE_MOTION_CATALOG_SCHEMA_VERSION = 1 as const;

export const RouteMotionSampleSchema = z
  .object({
    progress: z.number().min(0).max(1),
    targetSpeedMps: z.number().min(0),
    curvature: z.number().min(-1).max(1),
    surfaceRoughness: z.number().min(0).max(1),
  })
  .strict();

export const RouteMotionProfileSchema = z
  .object({
    segmentId: entityIdSchema('route-segment'),
    samples: z.array(RouteMotionSampleSchema).min(2),
  })
  .strict()
  .superRefine((profile, context) => {
    const first = profile.samples[0];
    const last = profile.samples.at(-1);

    if (first?.progress !== 0) {
      context.addIssue({
        code: 'custom',
        message: 'A route motion profile must start at progress 0.',
        path: ['samples', 0, 'progress'],
      });
    }

    if (last?.progress !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'A route motion profile must end at progress 1.',
        path: ['samples', profile.samples.length - 1, 'progress'],
      });
    }

    for (let index = 1; index < profile.samples.length; index += 1) {
      const previous = profile.samples[index - 1];
      const current = profile.samples[index];

      if (
        previous !== undefined &&
        current !== undefined &&
        current.progress <= previous.progress
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Route motion sample progress must increase strictly.',
          path: ['samples', index, 'progress'],
        });
      }
    }
  });

export const RouteMotionCatalogSchema = z
  .object({
    schemaVersion: z.literal(ROUTE_MOTION_CATALOG_SCHEMA_VERSION),
    profiles: z.array(RouteMotionProfileSchema),
  })
  .strict()
  .refine(
    (catalog) =>
      new Set(catalog.profiles.map((profile) => profile.segmentId)).size ===
      catalog.profiles.length,
    {
      message: 'Each route segment may have only one motion profile.',
      path: ['profiles'],
    },
  );

export type RouteMotionSample = z.infer<typeof RouteMotionSampleSchema>;
export type RouteMotionProfile = z.infer<typeof RouteMotionProfileSchema>;
export type RouteMotionCatalog = z.infer<typeof RouteMotionCatalogSchema>;

export function validateRouteMotionCatalog(
  input: unknown,
  worldInput: unknown,
): RouteMotionCatalog {
  const catalog = RouteMotionCatalogSchema.parse(input);
  const world = validateWorldContentCatalog(worldInput);
  const worldSegmentIds = new Set(
    world.routeSegments.map((segment) => segment.id),
  );
  const profileSegmentIds = new Set(
    catalog.profiles.map((profile) => profile.segmentId),
  );

  for (const profile of catalog.profiles) {
    if (!worldSegmentIds.has(profile.segmentId)) {
      throw new Error(
        `Motion profile references unknown route segment: ${profile.segmentId}`,
      );
    }
  }

  for (const segmentId of worldSegmentIds) {
    if (!profileSegmentIds.has(segmentId)) {
      throw new Error(
        `Route segment is missing a motion profile: ${segmentId}`,
      );
    }
  }

  return catalog;
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

export function sampleRouteMotion(
  profileInput: RouteMotionProfile,
  progressInput: number,
): RouteMotionSample {
  const profile = RouteMotionProfileSchema.parse(profileInput);
  const progress = Math.min(1, Math.max(0, progressInput));

  for (let index = 1; index < profile.samples.length; index += 1) {
    const previous = profile.samples[index - 1];
    const next = profile.samples[index];

    if (
      previous === undefined ||
      next === undefined ||
      progress > next.progress
    ) {
      continue;
    }

    const span = next.progress - previous.progress;
    const amount = span === 0 ? 0 : (progress - previous.progress) / span;

    return {
      progress,
      targetSpeedMps: lerp(
        previous.targetSpeedMps,
        next.targetSpeedMps,
        amount,
      ),
      curvature: lerp(previous.curvature, next.curvature, amount),
      surfaceRoughness: lerp(
        previous.surfaceRoughness,
        next.surfaceRoughness,
        amount,
      ),
    };
  }

  const last = profile.samples.at(-1);

  if (last === undefined) {
    throw new Error('Validated route motion profile unexpectedly has no samples.');
  }

  return {
    ...last,
    progress,
  };
}
