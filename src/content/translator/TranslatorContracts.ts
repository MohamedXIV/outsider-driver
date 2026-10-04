import * as z from 'zod';
import { createContentDocumentSchema } from '../schema/ContentDocument';
import { validateContentGraph } from '../validation/ContentGraph';
import { entityIdSchema } from '../../domain/ids/EntityId';

export const TRANSLATOR_CATALOG_SCHEMA_VERSION = 1 as const;
export const TRANSLATOR_RUNTIME_API_VERSION = 1 as const;

const displayNameSchema = z.string().trim().min(1).max(120);
const stableVocabularyKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const TranslationRegisterSchema = z.enum([
  'general',
  'dialect',
  'slang',
  'professional',
]);

export type TranslationRegister = z.infer<
  typeof TranslationRegisterSchema
>;

export const TranslatorPackLegalitySchema = z.enum([
  'licensed',
  'restricted',
  'illegal',
]);

export type TranslatorPackLegality = z.infer<
  typeof TranslatorPackLegalitySchema
>;

export const LanguageDataSchema = z
  .object({
    displayName: displayNameSchema,
    baseLanguageId: entityIdSchema('language').nullable(),
  })
  .strict();

export const LanguageDocumentSchema = createContentDocumentSchema(
  'language',
  LanguageDataSchema,
);

export const TranslatorCapabilitySchema = z
  .object({
    languageId: entityIdSchema('language'),
    register: TranslationRegisterSchema,
    vocabularyKey: stableVocabularyKeySchema.nullable(),
    coverage: z.number().min(0).max(1),
    quality: z.number().min(0).max(1),
    uncertainty: z.number().min(0).max(1),
  })
  .strict();

export const TranslatorCompatibilitySchema = z
  .object({
    minRuntimeApiVersion: z.number().int().positive(),
    maxRuntimeApiVersion: z.number().int().positive(),
  })
  .strict()
  .refine(
    (compatibility) =>
      compatibility.minRuntimeApiVersion <=
      compatibility.maxRuntimeApiVersion,
    {
      message:
        'Translator pack minimum runtime API version cannot exceed its maximum.',
      path: ['maxRuntimeApiVersion'],
    },
  );

export const TranslatorPackDataSchema = z
  .object({
    displayName: displayNameSchema,
    version: z.number().int().positive(),
    legality: TranslatorPackLegalitySchema,
    costCredits: z.number().int().nonnegative(),
    riskFootprint: z.number().min(0).max(100),
    compatibility: TranslatorCompatibilitySchema,
    capabilities: z.array(TranslatorCapabilitySchema).min(1),
  })
  .strict();

export const TranslatorPackDocumentSchema = createContentDocumentSchema(
  'translator-pack',
  TranslatorPackDataSchema,
);

export const TranslatorCatalogSchema = z
  .object({
    schemaVersion: z.literal(TRANSLATOR_CATALOG_SCHEMA_VERSION),
    languages: z.array(LanguageDocumentSchema),
    packs: z.array(TranslatorPackDocumentSchema),
  })
  .strict();

export type LanguageDocument = z.infer<typeof LanguageDocumentSchema>;
export type TranslatorCapability = z.infer<typeof TranslatorCapabilitySchema>;
export type TranslatorPackDocument = z.infer<
  typeof TranslatorPackDocumentSchema
>;
export type TranslatorCatalog = z.infer<typeof TranslatorCatalogSchema>;

export function validateTranslatorCatalog(input: unknown): TranslatorCatalog {
  const catalog = TranslatorCatalogSchema.parse(input);

  validateContentGraph({
    schemaVersion: 1,
    nodes: [
      ...catalog.languages.map((language) => ({
        id: language.id,
        references:
          language.data.baseLanguageId === null
            ? []
            : [
                {
                  id: language.data.baseLanguageId,
                  expectedKind: 'language' as const,
                },
              ],
      })),
      ...catalog.packs.map((pack) => ({
        id: pack.id,
        references: pack.data.capabilities.map((capability) => ({
          id: capability.languageId,
          expectedKind: 'language' as const,
        })),
      })),
    ],
  });

  return catalog;
}

export function isTranslatorPackCompatible(
  pack: TranslatorPackDocument,
  runtimeApiVersion: number = TRANSLATOR_RUNTIME_API_VERSION,
): boolean {
  return (
    pack.data.compatibility.minRuntimeApiVersion <= runtimeApiVersion &&
    runtimeApiVersion <= pack.data.compatibility.maxRuntimeApiVersion
  );
}
