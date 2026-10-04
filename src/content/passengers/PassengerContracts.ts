import * as z from 'zod';
import { createContentDocumentSchema } from '../schema/ContentDocument';
import { validateContentGraph } from '../validation/ContentGraph';

export const PASSENGER_CATALOG_SCHEMA_VERSION = 1 as const;

const displayNameSchema = z.string().trim().min(1).max(120);
const narrativeStoryIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const PassengerLifecycleKindSchema = z.enum([
  'routine',
  'recurring',
  'story',
]);

export type PassengerLifecycleKind = z.infer<
  typeof PassengerLifecycleKindSchema
>;

export const PassengerDataSchema = z
  .object({
    displayName: displayNameSchema,
    lifecycleKind: PassengerLifecycleKindSchema,
    narrativeStoryId: narrativeStoryIdSchema,
  })
  .strict();

export const PassengerDocumentSchema = createContentDocumentSchema(
  'passenger',
  PassengerDataSchema,
);

export const PassengerCatalogSchema = z
  .object({
    schemaVersion: z.literal(PASSENGER_CATALOG_SCHEMA_VERSION),
    passengers: z.array(PassengerDocumentSchema),
  })
  .strict();

export type PassengerDocument = z.infer<typeof PassengerDocumentSchema>;
export type PassengerCatalog = z.infer<typeof PassengerCatalogSchema>;

export function validatePassengerCatalog(input: unknown): PassengerCatalog {
  const catalog = PassengerCatalogSchema.parse(input);

  validateContentGraph({
    schemaVersion: 1,
    nodes: catalog.passengers.map((passenger) => ({
      id: passenger.id,
      references: [],
    })),
  });

  return catalog;
}
