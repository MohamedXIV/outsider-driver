import * as z from 'zod';
import { createContentDocumentSchema } from '../schema/ContentDocument';
import { validateContentGraph } from '../validation/ContentGraph';
import { entityIdSchema } from '../../domain/ids/EntityId';

export const WORLD_CATALOG_SCHEMA_VERSION = 1 as const;

const displayNameSchema = z.string().trim().min(1).max(120);
const stableHookSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

function uniqueIds(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const DistrictDataSchema = z
  .object({
    displayName: displayNameSchema,
  })
  .strict();

export const DistrictDocumentSchema = createContentDocumentSchema(
  'district',
  DistrictDataSchema,
);

export const LocationDataSchema = z
  .object({
    displayName: displayNameSchema,
    districtId: entityIdSchema('district'),
  })
  .strict();

export const LocationDocumentSchema = createContentDocumentSchema(
  'location',
  LocationDataSchema,
);

export const RouteEventDataSchema = z
  .object({
    hookId: stableHookSchema,
    atProgress: z.number().min(0).max(1),
  })
  .strict();

export const RouteEventDocumentSchema = createContentDocumentSchema(
  'route-event',
  RouteEventDataSchema,
);

export const RouteSegmentDataSchema = z
  .object({
    districtId: entityIdSchema('district'),
    durationMinutes: z.number().int().positive(),
    eventIds: z.array(entityIdSchema('route-event')),
  })
  .strict()
  .refine((segment) => uniqueIds(segment.eventIds), {
    message: 'A route segment cannot list the same route event twice.',
    path: ['eventIds'],
  });

export const RouteSegmentDocumentSchema = createContentDocumentSchema(
  'route-segment',
  RouteSegmentDataSchema,
);

export const RouteDataSchema = z
  .object({
    displayName: displayNameSchema,
    originLocationId: entityIdSchema('location'),
    destinationLocationId: entityIdSchema('location'),
    segmentIds: z.array(entityIdSchema('route-segment')).min(1),
  })
  .strict()
  .refine((route) => uniqueIds(route.segmentIds), {
    message: 'A route cannot list the same route segment twice.',
    path: ['segmentIds'],
  });

export const RouteDocumentSchema = createContentDocumentSchema(
  'route',
  RouteDataSchema,
);

export const WorldContentCatalogSchema = z
  .object({
    schemaVersion: z.literal(WORLD_CATALOG_SCHEMA_VERSION),
    districts: z.array(DistrictDocumentSchema),
    locations: z.array(LocationDocumentSchema),
    routeEvents: z.array(RouteEventDocumentSchema),
    routeSegments: z.array(RouteSegmentDocumentSchema),
    routes: z.array(RouteDocumentSchema),
  })
  .strict();

export type DistrictDocument = z.infer<typeof DistrictDocumentSchema>;
export type LocationDocument = z.infer<typeof LocationDocumentSchema>;
export type RouteEventDocument = z.infer<typeof RouteEventDocumentSchema>;
export type RouteSegmentDocument = z.infer<typeof RouteSegmentDocumentSchema>;
export type RouteDocument = z.infer<typeof RouteDocumentSchema>;
export type WorldContentCatalog = z.infer<typeof WorldContentCatalogSchema>;

export function validateWorldContentCatalog(
  input: unknown,
): WorldContentCatalog {
  const catalog = WorldContentCatalogSchema.parse(input);

  validateContentGraph({
    schemaVersion: 1,
    nodes: [
      ...catalog.districts.map((district) => ({
        id: district.id,
        references: [],
      })),
      ...catalog.locations.map((location) => ({
        id: location.id,
        references: [
          {
            id: location.data.districtId,
            expectedKind: 'district' as const,
          },
        ],
      })),
      ...catalog.routeEvents.map((event) => ({
        id: event.id,
        references: [],
      })),
      ...catalog.routeSegments.map((segment) => ({
        id: segment.id,
        references: [
          {
            id: segment.data.districtId,
            expectedKind: 'district' as const,
          },
          ...segment.data.eventIds.map((eventId) => ({
            id: eventId,
            expectedKind: 'route-event' as const,
          })),
        ],
      })),
      ...catalog.routes.map((route) => ({
        id: route.id,
        references: [
          {
            id: route.data.originLocationId,
            expectedKind: 'location' as const,
          },
          {
            id: route.data.destinationLocationId,
            expectedKind: 'location' as const,
          },
          ...route.data.segmentIds.map((segmentId) => ({
            id: segmentId,
            expectedKind: 'route-segment' as const,
          })),
        ],
      })),
    ],
  });

  return catalog;
}
