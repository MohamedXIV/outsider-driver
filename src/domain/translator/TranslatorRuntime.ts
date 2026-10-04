import * as z from 'zod';
import {
  entityIdSchema,
  type TranslatorPackId,
} from '../ids/EntityId';
import {
  TranslationRegisterSchema,
  type TranslatorCapability,
  type TranslatorPackLegality,
} from '../../content/translator/TranslatorContracts';
import type { TranslatorStateStore } from './TranslatorState';

const stableVocabularyKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const TranslationRequirementSchema = z
  .object({
    languageId: entityIdSchema('language'),
    register: TranslationRegisterSchema,
    vocabularyKey: stableVocabularyKeySchema.nullable(),
    difficulty: z.number().min(0).max(1),
  })
  .strict();

export type TranslationRequirement = z.infer<
  typeof TranslationRequirementSchema
>;

export const TranslationComprehensionLevelSchema = z.enum([
  'none',
  'gist',
  'partial',
  'full',
]);

export type TranslationComprehensionLevel = z.infer<
  typeof TranslationComprehensionLevelSchema
>;

export const TRANSLATION_LEVEL_CODE = {
  none: 0,
  gist: 1,
  partial: 2,
  full: 3,
} as const satisfies Record<TranslationComprehensionLevel, number>;

export interface TranslationAssessment {
  readonly level: TranslationComprehensionLevel;
  readonly levelCode: number;
  readonly score: number;
  readonly matchedPackIds: readonly TranslatorPackId[];
}

export interface ActiveTranslatorRiskSignal {
  readonly packId: TranslatorPackId;
  readonly legality: TranslatorPackLegality;
  readonly riskFootprint: number;
}

function capabilityMatches(
  capability: TranslatorCapability,
  requirement: TranslationRequirement,
): boolean {
  return (
    capability.languageId === requirement.languageId &&
    capability.register === requirement.register &&
    capability.vocabularyKey === requirement.vocabularyKey
  );
}

function capabilityScore(
  capability: TranslatorCapability,
  difficulty: number,
): number {
  const reliability = capability.quality * (1 - capability.uncertainty);
  const difficultyMultiplier = 1 - difficulty * 0.5;

  return capability.coverage * reliability * difficultyMultiplier;
}

function levelForScore(score: number): TranslationComprehensionLevel {
  if (score >= 0.8) {
    return 'full';
  }

  if (score >= 0.5) {
    return 'partial';
  }

  if (score >= 0.2) {
    return 'gist';
  }

  return 'none';
}

export class TranslatorRuntime {
  readonly #state: TranslatorStateStore;

  public constructor(state: TranslatorStateStore) {
    this.#state = state;
  }

  public assess(input: unknown): TranslationAssessment {
    const requirement = TranslationRequirementSchema.parse(input);
    const matches = this.#state
      .getActivePacks()
      .flatMap((pack) =>
        pack.data.capabilities
          .filter((capability) =>
            capabilityMatches(capability, requirement),
          )
          .map((capability) => ({
            packId: pack.id,
            score: capabilityScore(
              capability,
              requirement.difficulty,
            ),
          })),
      );

    const bestScore = matches.reduce(
      (best, match) => Math.max(best, match.score),
      0,
    );
    const score = Math.round(bestScore * 1000) / 1000;
    const level = levelForScore(score);

    return {
      level,
      levelCode: TRANSLATION_LEVEL_CODE[level],
      score,
      matchedPackIds: matches.map((match) => match.packId),
    };
  }

  public getActiveRiskSignals(): readonly ActiveTranslatorRiskSignal[] {
    return this.#state.getActivePacks().map((pack) => ({
      packId: pack.id,
      legality: pack.data.legality,
      riskFootprint: pack.data.riskFootprint,
    }));
  }
}
