import * as z from 'zod';
import {
  entityIdSchema,
  type DistrictId,
  type RouteEventId,
  type RouteId,
  type RouteSegmentId,
} from '../../domain/ids/EntityId';
import {
  validateWorldContentCatalog,
  type WorldContentCatalog,
} from '../world/WorldContracts';

export const ROUTE_EXPERIENCE_SCHEMA_VERSION = 1 as const;

const stableTokenSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const colorSchema = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
]);

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

const ContinueRouteCommandSchema = z
  .object({
    type: z.literal('continue'),
  })
  .strict();

const DivertRouteCommandSchema = z
  .object({
    type: z.literal('divert'),
    routeId: entityIdSchema('route'),
  })
  .strict();

export const RouteDecisionCommandSchema = z.discriminatedUnion('type', [
  ContinueRouteCommandSchema,
  DivertRouteCommandSchema,
]);

export const RouteDecisionChoiceSchema = z
  .object({
    id: stableTokenSchema,
    labelKey: stableTokenSchema,
    command: RouteDecisionCommandSchema,
  })
  .strict();

const AnnotationBehaviorSchema = z
  .object({
    type: z.literal('annotation'),
    annotationId: stableTokenSchema,
  })
  .strict();

const CheckpointBehaviorSchema = z
  .object({
    type: z.literal('checkpoint'),
    checkpointId: stableTokenSchema,
  })
  .strict();

const DecisionBehaviorSchema = z
  .object({
    type: z.literal('decision'),
    promptKey: stableTokenSchema,
    choices: z.array(RouteDecisionChoiceSchema).min(2),
  })
  .strict()
  .refine(
    (decision) =>
      new Set(decision.choices.map((choice) => choice.id)).size ===
      decision.choices.length,
    {
      message: 'Route decision choice IDs must be unique.',
      path: ['choices'],
    },
  );

export const RouteEventBehaviorSchema = z.discriminatedUnion('type', [
  AnnotationBehaviorSchema,
  CheckpointBehaviorSchema,
  DecisionBehaviorSchema,
]);

export const RouteEventExperienceSchema = z
  .object({
    eventId: entityIdSchema('route-event'),
    behavior: RouteEventBehaviorSchema,
  })
  .strict();

export const DistrictVisualProfileSchema = z
  .object({
    districtId: entityIdSchema('district'),
    clearColor: colorSchema,
    ambientColor: colorSchema,
    ambientIntensity: z.number().min(0),
    fogColor: colorSchema,
    baseFogDensity: z.number().min(0),
    rainFogDensity: z.number().min(0),
    nightAmbientMultiplier: z.number().min(0),
    dayAmbientMultiplier: z.number().min(0),
    precipitationAmbientMultiplier: z.number().min(0),
  })
  .strict();

export const RouteSceneryModuleSchema = z
  .object({
    id: stableTokenSchema,
    kind: z.literal('box'),
    position: vector3Schema,
    size: z.tuple([
      z.number().positive(),
      z.number().positive(),
      z.number().positive(),
    ]),
    diffuseColor: colorSchema,
    emissiveColor: colorSchema.default([0, 0, 0]),
  })
  .strict();

export const RouteSegmentScenerySchema = z
  .object({
    segmentId: entityIdSchema('route-segment'),
    travelDistanceMeters: z.number().positive(),
    modules: z.array(RouteSceneryModuleSchema),
  })
  .strict()
  .refine(
    (scenery) =>
      new Set(scenery.modules.map((module) => module.id)).size ===
      scenery.modules.length,
    {
      message: 'Scenery module IDs must be unique within a route segment.',
      path: ['modules'],
    },
  );

export const RouteExperienceCatalogSchema = z
  .object({
    schemaVersion: z.literal(ROUTE_EXPERIENCE_SCHEMA_VERSION),
    events: z.array(RouteEventExperienceSchema),
    districtVisuals: z.array(DistrictVisualProfileSchema),
    segmentScenery: z.array(RouteSegmentScenerySchema),
  })
  .strict();

export type RouteDecisionCommand = z.infer<
  typeof RouteDecisionCommandSchema
>;
export type RouteDecisionChoice = z.infer<
  typeof RouteDecisionChoiceSchema
>;
export type RouteEventBehavior = z.infer<typeof RouteEventBehaviorSchema>;
export type RouteEventExperience = z.infer<typeof RouteEventExperienceSchema>;
export type DistrictVisualProfile = z.infer<
  typeof DistrictVisualProfileSchema
>;
export type RouteSegmentScenery = z.infer<
  typeof RouteSegmentScenerySchema
>;
export type RouteExperienceCatalog = z.infer<
  typeof RouteExperienceCatalogSchema
>;

function requireExactCoverage<TId extends string>(
  authoredIds: readonly TId[],
  configuredIds: readonly TId[],
  label: string,
): void {
  const authored = new Set(authoredIds);
  const configured = new Set(configuredIds);

  if (configured.size !== configuredIds.length) {
    throw new Error(`Duplicate ${label} configuration.`);
  }

  for (const id of configured) {
    if (!authored.has(id)) {
      throw new Error(`${label} references unknown authored ID: ${id}`);
    }
  }

  for (const id of authored) {
    if (!configured.has(id)) {
      throw new Error(`Missing ${label} configuration for: ${id}`);
    }
  }
}

function validateDiversionRoutes(
  catalog: RouteExperienceCatalog,
  world: WorldContentCatalog,
): void {
  const routeIds = new Set<RouteId>(world.routes.map((route) => route.id));

  for (const event of catalog.events) {
    if (event.behavior.type !== 'decision') {
      continue;
    }

    for (const choice of event.behavior.choices) {
      if (
        choice.command.type === 'divert' &&
        !routeIds.has(choice.command.routeId)
      ) {
        throw new Error(
          `Route decision references unknown diversion route: ${choice.command.routeId}`,
        );
      }
    }
  }
}

export function validateRouteExperienceCatalog(
  input: unknown,
  worldInput: unknown,
): RouteExperienceCatalog {
  const catalog = RouteExperienceCatalogSchema.parse(input);
  const world = validateWorldContentCatalog(worldInput);

  requireExactCoverage<RouteEventId>(
    world.routeEvents.map((event) => event.id),
    catalog.events.map((event) => event.eventId),
    'route event experience',
  );
  requireExactCoverage<DistrictId>(
    world.districts.map((district) => district.id),
    catalog.districtVisuals.map((visual) => visual.districtId),
    'district visual',
  );
  requireExactCoverage<RouteSegmentId>(
    world.routeSegments.map((segment) => segment.id),
    catalog.segmentScenery.map((scenery) => scenery.segmentId),
    'route segment scenery',
  );
  validateDiversionRoutes(catalog, world);

  return catalog;
}

export const RouteEnvironmentInputSchema = z
  .object({
    daylightFactor: z.number().min(0).max(1),
    precipitation: z.number().min(0).max(1),
  })
  .strict();

export type RouteEnvironmentInput = z.infer<
  typeof RouteEnvironmentInputSchema
>;

export interface ResolvedRouteEnvironment {
  readonly clearColor: readonly [number, number, number];
  readonly ambientColor: readonly [number, number, number];
  readonly ambientIntensity: number;
  readonly fogColor: readonly [number, number, number];
  readonly fogDensity: number;
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

export function resolveRouteEnvironment(
  profileInput: DistrictVisualProfile,
  environmentInput: RouteEnvironmentInput,
): ResolvedRouteEnvironment {
  const profile = DistrictVisualProfileSchema.parse(profileInput);
  const environment = RouteEnvironmentInputSchema.parse(environmentInput);
  const daylightMultiplier = lerp(
    profile.nightAmbientMultiplier,
    profile.dayAmbientMultiplier,
    environment.daylightFactor,
  );
  const precipitationMultiplier = lerp(
    1,
    profile.precipitationAmbientMultiplier,
    environment.precipitation,
  );

  return {
    clearColor: profile.clearColor,
    ambientColor: profile.ambientColor,
    ambientIntensity:
      profile.ambientIntensity *
      daylightMultiplier *
      precipitationMultiplier,
    fogColor: profile.fogColor,
    fogDensity: lerp(
      profile.baseFogDensity,
      profile.rainFogDensity,
      environment.precipitation,
    ),
  };
}
