import * as z from 'zod';
import {
  entityIdSchema,
  type ClaimId,
  type FactId,
  type PassengerId,
} from '../ids/EntityId';

export const SOCIAL_STEALTH_STATE_SCHEMA_VERSION = 1 as const;

export const SocialKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const ClaimValueSchema = z.string().trim().min(1).max(240);

export const CoverIdentityAttributeSchema = z
  .object({
    key: SocialKeySchema,
    value: ClaimValueSchema,
  })
  .strict();

export const CoverIdentityProfileSchema = z
  .object({
    id: entityIdSchema('identity'),
    displayName: z.string().trim().min(1).max(120),
    attributes: z.array(CoverIdentityAttributeSchema),
  })
  .strict()
  .refine(
    (identity) =>
      new Set(identity.attributes.map((attribute) => attribute.key)).size ===
      identity.attributes.length,
    {
      message: 'Cover identity attribute keys must be unique.',
      path: ['attributes'],
    },
  );

export type CoverIdentityProfile = z.infer<
  typeof CoverIdentityProfileSchema
>;

const PublicClaimAudienceSchema = z
  .object({
    kind: z.literal('public'),
  })
  .strict();

const PassengerClaimAudienceSchema = z
  .object({
    kind: z.literal('passenger'),
    passengerId: entityIdSchema('passenger'),
  })
  .strict();

export const ClaimAudienceSchema = z.discriminatedUnion('kind', [
  PublicClaimAudienceSchema,
  PassengerClaimAudienceSchema,
]);

export type ClaimAudience = z.infer<typeof ClaimAudienceSchema>;

export const ClaimSourceSchema = z
  .object({
    kind: z.enum(['player', 'narrative', 'identity', 'system']),
    sourceId: SocialKeySchema,
  })
  .strict();

export type ClaimSource = z.infer<typeof ClaimSourceSchema>;

export const ClaimRecordSchema = z
  .object({
    id: entityIdSchema('claim'),
    subject: SocialKeySchema,
    value: ClaimValueSchema,
    context: SocialKeySchema,
    audience: ClaimAudienceSchema,
    source: ClaimSourceSchema,
  })
  .strict();

export type ClaimRecord = z.infer<typeof ClaimRecordSchema>;

export const ClaimProposalSchema = ClaimRecordSchema.pick({
  subject: true,
  value: true,
  context: true,
  audience: true,
});

export type ClaimProposal = z.infer<typeof ClaimProposalSchema>;

const PassengerSuspicionEntrySchema = z
  .object({
    passengerId: entityIdSchema('passenger'),
    value: z.number().min(0).max(100),
    lastReason: SocialKeySchema.nullable(),
  })
  .strict();

const CityAttentionSchema = z
  .object({
    value: z.number().min(0).max(100),
    lastReason: SocialKeySchema.nullable(),
  })
  .strict();

export const SocialStealthStateSchema = z
  .object({
    schemaVersion: z.literal(SOCIAL_STEALTH_STATE_SCHEMA_VERSION),
    coverIdentity: CoverIdentityProfileSchema,
    claims: z.array(ClaimRecordSchema),
    knownFactIds: z.array(entityIdSchema('fact')),
    passengerSuspicion: z.array(PassengerSuspicionEntrySchema),
    cityAttention: CityAttentionSchema,
  })
  .strict()
  .refine(
    (state) =>
      new Set(state.claims.map((claim) => claim.id)).size ===
      state.claims.length,
    {
      message: 'Claim IDs must be unique.',
      path: ['claims'],
    },
  )
  .refine(
    (state) =>
      new Set(state.knownFactIds).size === state.knownFactIds.length,
    {
      message: 'Known fact IDs must be unique.',
      path: ['knownFactIds'],
    },
  )
  .refine(
    (state) =>
      new Set(
        state.passengerSuspicion.map((entry) => entry.passengerId),
      ).size === state.passengerSuspicion.length,
    {
      message: 'Passenger suspicion entries must be unique.',
      path: ['passengerSuspicion'],
    },
  );

export type SocialStealthState = z.infer<typeof SocialStealthStateSchema>;

function clampMeter(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function audiencesOverlap(
  left: ClaimAudience,
  right: ClaimAudience,
): boolean {
  if (left.kind === 'public' || right.kind === 'public') {
    return true;
  }

  return left.passengerId === right.passengerId;
}

function claimsConflict(
  existing: ClaimRecord,
  proposed: ClaimProposal,
): boolean {
  return (
    existing.subject === proposed.subject &&
    existing.context === proposed.context &&
    existing.value !== proposed.value &&
    audiencesOverlap(existing.audience, proposed.audience)
  );
}

export function createSocialStealthState(
  coverIdentityInput: unknown,
): SocialStealthState {
  return SocialStealthStateSchema.parse({
    schemaVersion: SOCIAL_STEALTH_STATE_SCHEMA_VERSION,
    coverIdentity: CoverIdentityProfileSchema.parse(coverIdentityInput),
    claims: [],
    knownFactIds: [],
    passengerSuspicion: [],
    cityAttention: {
      value: 0,
      lastReason: null,
    },
  });
}

export class SocialStealthStateStore {
  #state: SocialStealthState;

  public constructor(stateInput: unknown) {
    this.#state = SocialStealthStateSchema.parse(stateInput);
  }

  public exportState(): SocialStealthState {
    return SocialStealthStateSchema.parse(this.#state);
  }

  public hasFact(factId: FactId): boolean {
    return this.#state.knownFactIds.includes(factId);
  }

  public learnFact(factId: FactId): SocialStealthState {
    if (!this.#state.knownFactIds.includes(factId)) {
      this.#state = SocialStealthStateSchema.parse({
        ...this.#state,
        knownFactIds: [...this.#state.knownFactIds, factId],
      });
    }

    return this.exportState();
  }

  public hasClaim(claimId: ClaimId): boolean {
    return this.#state.claims.some((claim) => claim.id === claimId);
  }

  public recordClaim(claimInput: unknown): SocialStealthState {
    const claim = ClaimRecordSchema.parse(claimInput);
    const existing = this.#state.claims.find(
      (candidate) => candidate.id === claim.id,
    );

    if (existing !== undefined) {
      if (JSON.stringify(existing) === JSON.stringify(claim)) {
        return this.exportState();
      }

      throw new Error(
        `Claim ID ${claim.id} already exists with different data.`,
      );
    }

    this.#state = SocialStealthStateSchema.parse({
      ...this.#state,
      claims: [...this.#state.claims, claim],
    });

    return this.exportState();
  }

  public findContradictions(
    proposalInput: unknown,
  ): readonly ClaimRecord[] {
    const proposal = ClaimProposalSchema.parse(proposalInput);

    return this.#state.claims.filter((claim) =>
      claimsConflict(claim, proposal),
    );
  }

  public wouldContradict(proposalInput: unknown): boolean {
    return this.findContradictions(proposalInput).length > 0;
  }

  public coverIdentityMatches(
    key: string,
    value: string,
  ): boolean {
    const parsedKey = SocialKeySchema.parse(key);
    const parsedValue = ClaimValueSchema.parse(value);

    return this.#state.coverIdentity.attributes.some(
      (attribute) =>
        attribute.key === parsedKey &&
        attribute.value === parsedValue,
    );
  }

  public getPassengerSuspicion(passengerId: PassengerId): number {
    return (
      this.#state.passengerSuspicion.find(
        (entry) => entry.passengerId === passengerId,
      )?.value ?? 0
    );
  }

  public adjustPassengerSuspicion(
    passengerId: PassengerId,
    delta: number,
    reason: string,
  ): SocialStealthState {
    const parsedDelta = z.number().min(-100).max(100).parse(delta);
    const parsedReason = SocialKeySchema.parse(reason);
    const current = this.getPassengerSuspicion(passengerId);
    const nextValue = clampMeter(current + parsedDelta);
    const remaining = this.#state.passengerSuspicion.filter(
      (entry) => entry.passengerId !== passengerId,
    );

    this.#state = SocialStealthStateSchema.parse({
      ...this.#state,
      passengerSuspicion: [
        ...remaining,
        {
          passengerId,
          value: nextValue,
          lastReason: parsedReason,
        },
      ],
    });

    return this.exportState();
  }

  public getCityAttention(): number {
    return this.#state.cityAttention.value;
  }

  public adjustCityAttention(
    delta: number,
    reason: string,
  ): SocialStealthState {
    const parsedDelta = z.number().min(-100).max(100).parse(delta);
    const parsedReason = SocialKeySchema.parse(reason);

    this.#state = SocialStealthStateSchema.parse({
      ...this.#state,
      cityAttention: {
        value: clampMeter(this.#state.cityAttention.value + parsedDelta),
        lastReason: parsedReason,
      },
    });

    return this.exportState();
  }
}
