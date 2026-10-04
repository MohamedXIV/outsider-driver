import * as z from 'zod';

export const ENTITY_KINDS = [
  'passenger',
  'district',
  'location',
  'route',
  'route-segment',
  'route-event',
  'job',
  'ride',
  'identity',
  'claim',
  'fact',
  'language',
  'translator-pack',
  'radio-station',
  'broadcast',
  'taxi-upgrade',
  'item',
] as const;

export const EntityKindSchema = z.enum(ENTITY_KINDS);
export type EntityKind = z.infer<typeof EntityKindSchema>;

declare const entityIdBrand: unique symbol;

export type EntityId<K extends EntityKind = EntityKind> = string & {
  readonly [entityIdBrand]: K;
};

const slugPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

interface EntityIdParts {
  readonly kind: string;
  readonly slug: string;
}

function splitEntityId(value: string): EntityIdParts | null {
  const separatorIndex = value.indexOf(':');

  if (
    separatorIndex <= 0 ||
    separatorIndex === value.length - 1 ||
    value.indexOf(':', separatorIndex + 1) !== -1
  ) {
    return null;
  }

  return {
    kind: value.slice(0, separatorIndex),
    slug: value.slice(separatorIndex + 1),
  };
}

function isValidEntityId(value: string, expectedKind?: EntityKind): boolean {
  const parts = splitEntityId(value);

  if (parts === null || !slugPattern.test(parts.slug)) {
    return false;
  }

  const parsedKind = EntityKindSchema.safeParse(parts.kind);

  if (!parsedKind.success) {
    return false;
  }

  return expectedKind === undefined || parsedKind.data === expectedKind;
}

export const EntityIdSchema = z
  .string()
  .refine((value) => isValidEntityId(value), {
    message:
      'Entity IDs must use a known kind prefix and a lowercase stable slug, for example passenger:mina-01.',
  })
  .transform((value) => value as EntityId);

export function entityIdSchema<K extends EntityKind>(kind: K) {
  return z
    .string()
    .refine((value) => isValidEntityId(value, kind), {
      message: `Expected a stable ${kind}:<slug> ID.`,
    })
    .transform((value) => value as EntityId<K>);
}

export function entityId<K extends EntityKind>(
  kind: K,
  slug: string,
): EntityId<K> {
  return entityIdSchema(kind).parse(`${kind}:${slug}`);
}

export function getEntityKind(id: EntityId): EntityKind {
  const parts = splitEntityId(id);

  if (parts === null) {
    throw new Error(`Invalid branded entity ID: ${id}`);
  }

  return EntityKindSchema.parse(parts.kind);
}

export type PassengerId = EntityId<'passenger'>;
export type DistrictId = EntityId<'district'>;
export type LocationId = EntityId<'location'>;
export type RouteId = EntityId<'route'>;
export type RouteSegmentId = EntityId<'route-segment'>;
export type RouteEventId = EntityId<'route-event'>;
export type JobId = EntityId<'job'>;
export type RideId = EntityId<'ride'>;
export type IdentityId = EntityId<'identity'>;
export type ClaimId = EntityId<'claim'>;
export type FactId = EntityId<'fact'>;
export type LanguageId = EntityId<'language'>;
export type TranslatorPackId = EntityId<'translator-pack'>;
export type RadioStationId = EntityId<'radio-station'>;
export type BroadcastId = EntityId<'broadcast'>;
export type TaxiUpgradeId = EntityId<'taxi-upgrade'>;
export type ItemId = EntityId<'item'>;
