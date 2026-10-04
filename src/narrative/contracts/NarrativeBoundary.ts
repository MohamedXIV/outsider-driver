import * as z from 'zod';
import {
  entityIdSchema,
  type ClaimId,
  type FactId,
  type PassengerId,
} from '../../domain/ids/EntityId';
import {
  ClaimRecordSchema,
  type ClaimProposal,
} from '../../domain/social/SocialStealthState';
import type { TranslationRequirement } from '../../domain/translator/TranslatorRuntime';

export const NARRATIVE_EXTERNAL_FUNCTIONS = [
  'GAME_HAS_FACT',
  'GAME_HAS_CLAIM',
  'GAME_COVER_MATCHES',
  'GAME_CLAIM_CONTRADICTS',
  'GAME_PASSENGER_SUSPICION',
  'GAME_CITY_ATTENTION',
  'GAME_TRANSLATION_LEVEL',
  'GAME_REVEAL_FACT',
  'GAME_RECORD_CLAIM',
  'GAME_ADJUST_SUSPICION',
  'GAME_ADJUST_CITY_ATTENTION',
] as const;

export const NarrativeExternalFunctionSchema = z.enum(
  NARRATIVE_EXTERNAL_FUNCTIONS,
);

export type NarrativeExternalFunction = z.infer<
  typeof NarrativeExternalFunctionSchema
>;

const reasonSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const adjustmentSchema = z.number().min(-100).max(100);

const RevealFactEventSchema = z
  .object({
    type: z.literal('knowledge.reveal'),
    factId: entityIdSchema('fact'),
  })
  .strict();

const RecordClaimEventSchema = z
  .object({
    type: z.literal('claim.record'),
    claim: ClaimRecordSchema,
  })
  .strict();

const AdjustSuspicionEventSchema = z
  .object({
    type: z.literal('suspicion.adjust'),
    passengerId: entityIdSchema('passenger'),
    delta: adjustmentSchema,
    reason: reasonSchema,
  })
  .strict();

const AdjustCityAttentionEventSchema = z
  .object({
    type: z.literal('city-attention.adjust'),
    delta: adjustmentSchema,
    reason: reasonSchema,
  })
  .strict();

export const NarrativeDomainEventSchema = z.discriminatedUnion('type', [
  RevealFactEventSchema,
  RecordClaimEventSchema,
  AdjustSuspicionEventSchema,
  AdjustCityAttentionEventSchema,
]);

export type NarrativeDomainEvent = z.infer<
  typeof NarrativeDomainEventSchema
>;

export interface TranslatorNarrativeQueryPort {
  getTranslationLevel(requirement: TranslationRequirement): number;
}

export interface NarrativeQueryPort {
  readonly translator?: TranslatorNarrativeQueryPort;
  hasFact(factId: FactId): boolean;
  hasClaim(claimId: ClaimId): boolean;
  coverIdentityMatches(key: string, value: string): boolean;
  wouldContradictClaim(proposal: ClaimProposal): boolean;
  getPassengerSuspicion(passengerId: PassengerId): number;
  getCityAttention(): number;
}

export interface NarrativeEventSink {
  emit(event: NarrativeDomainEvent): void;
}
