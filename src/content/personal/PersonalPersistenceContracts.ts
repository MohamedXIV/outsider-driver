import * as z from 'zod';
import { entityIdSchema } from '../../domain/ids/EntityId';
import type { PassengerCatalog } from '../passengers/PassengerContracts';
import { createContentDocumentSchema } from '../schema/ContentDocument';

export const PERSONAL_PERSISTENCE_CATALOG_SCHEMA_VERSION = 1 as const;

export const PersonalStableKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const displayNameSchema = z.string().trim().min(1).max(120);
const creditAmountSchema = z.number().int().nonnegative();

export const TaxiUpgradeSlotSchema = z.enum([
  'partition',
  'radio',
  'sensor',
  'utility',
  'translator-support',
]);

export type TaxiUpgradeSlot = z.infer<typeof TaxiUpgradeSlotSchema>;

export const UpgradeLegalitySchema = z.enum([
  'licensed',
  'restricted',
  'illegal',
]);

export const TaxiUpgradeDataSchema = z
  .object({
    displayName: displayNameSchema,
    slot: TaxiUpgradeSlotSchema,
    purchaseCostCredits: creditAmountSchema,
    installationCostCredits: creditAmountSchema,
    legality: UpgradeLegalitySchema,
    riskFootprint: z.number().min(0).max(100),
    capabilities: z.array(PersonalStableKeySchema).min(1),
  })
  .strict()
  .refine(
    (upgrade) =>
      new Set(upgrade.capabilities).size ===
      upgrade.capabilities.length,
    {
      message: 'Taxi upgrade capabilities must be unique.',
      path: ['capabilities'],
    },
  );

export const TaxiUpgradeDocumentSchema = createContentDocumentSchema(
  'taxi-upgrade',
  TaxiUpgradeDataSchema,
);

export const PersonalItemDataSchema = z
  .object({
    displayName: displayNameSchema,
    kind: z.enum(['souvenir', 'utility', 'document']),
    presentationKey: PersonalStableKeySchema,
    capabilities: z.array(PersonalStableKeySchema),
  })
  .strict()
  .refine(
    (item) =>
      new Set(item.capabilities).size === item.capabilities.length,
    {
      message: 'Item capabilities must be unique.',
      path: ['capabilities'],
    },
  );

export const PersonalItemDocumentSchema = createContentDocumentSchema(
  'item',
  PersonalItemDataSchema,
);

export const PersonalMessageDataSchema = z
  .object({
    kind: z.enum(['message', 'callback']),
    senderKey: PersonalStableKeySchema,
    passengerId: entityIdSchema('passenger').nullable(),
    subjectKey: PersonalStableKeySchema,
    bodyKey: PersonalStableKeySchema,
  })
  .strict();

export const PersonalMessageDocumentSchema = createContentDocumentSchema(
  'message',
  PersonalMessageDataSchema,
);

export const MaintenanceIssueDefinitionSchema = z
  .object({
    id: PersonalStableKeySchema,
    displayName: displayNameSchema,
    severity: z.enum(['minor', 'major', 'critical']),
    repairCostCredits: creditAmountSchema,
    conditionRestored: z.number().int().min(1).max(100),
  })
  .strict();

export const PersonalPersistenceCatalogSchema = z
  .object({
    schemaVersion: z.literal(
      PERSONAL_PERSISTENCE_CATALOG_SCHEMA_VERSION,
    ),
    upgrades: z.array(TaxiUpgradeDocumentSchema),
    items: z.array(PersonalItemDocumentSchema),
    messages: z.array(PersonalMessageDocumentSchema),
    maintenanceIssues: z.array(MaintenanceIssueDefinitionSchema),
  })
  .strict()
  .superRefine((catalog, context) => {
    const requireUnique = (
      values: readonly string[],
      label: string,
      path: string,
    ) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: 'custom',
          message: `${label} IDs must be unique.`,
          path: [path],
        });
      }
    };

    requireUnique(
      catalog.upgrades.map((upgrade) => upgrade.id),
      'Taxi upgrade',
      'upgrades',
    );
    requireUnique(
      catalog.items.map((item) => item.id),
      'Personal item',
      'items',
    );
    requireUnique(
      catalog.messages.map((message) => message.id),
      'Personal message',
      'messages',
    );
    requireUnique(
      catalog.maintenanceIssues.map((issue) => issue.id),
      'Maintenance issue',
      'maintenanceIssues',
    );
  });

export type TaxiUpgradeDocument = z.infer<
  typeof TaxiUpgradeDocumentSchema
>;
export type PersonalItemDocument = z.infer<
  typeof PersonalItemDocumentSchema
>;
export type PersonalMessageDocument = z.infer<
  typeof PersonalMessageDocumentSchema
>;
export type MaintenanceIssueDefinition = z.infer<
  typeof MaintenanceIssueDefinitionSchema
>;
export type PersonalPersistenceCatalog = z.infer<
  typeof PersonalPersistenceCatalogSchema
>;

export function validatePersonalPersistenceCatalog(
  input: unknown,
  passengers: PassengerCatalog,
): PersonalPersistenceCatalog {
  const catalog = PersonalPersistenceCatalogSchema.parse(input);
  const passengerIds = new Set(
    passengers.passengers.map((passenger) => passenger.id),
  );

  for (const message of catalog.messages) {
    const passengerId = message.data.passengerId;

    if (
      passengerId !== null &&
      !passengerIds.has(passengerId)
    ) {
      throw new Error(
        `${message.id} references unknown passenger ${passengerId}`,
      );
    }
  }

  return catalog;
}
