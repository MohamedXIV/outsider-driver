import * as z from 'zod';
import {
  entityIdSchema,
  type EntityId,
  type EntityKind,
} from '../../domain/ids/EntityId';

export const CONTENT_DOCUMENT_SCHEMA_VERSION = 1 as const;

export function createContentDocumentSchema<
  K extends EntityKind,
  S extends z.ZodType,
>(kind: K, dataSchema: S) {
  return z
    .object({
      schemaVersion: z.literal(CONTENT_DOCUMENT_SCHEMA_VERSION),
      id: entityIdSchema(kind),
      data: dataSchema,
    })
    .strict();
}

export interface ContentDocument<K extends EntityKind, TData> {
  readonly schemaVersion: typeof CONTENT_DOCUMENT_SCHEMA_VERSION;
  readonly id: EntityId<K>;
  readonly data: TData;
}
