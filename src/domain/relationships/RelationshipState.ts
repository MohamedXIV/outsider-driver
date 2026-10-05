import * as z from 'zod';
import {
  entityIdSchema,
  type PassengerId,
  type RideId,
} from '../ids/EntityId';
import {
  GameTimeSchema,
  compareGameTime,
  type GameTime,
} from '../time/GameTime';
import {
  RelationshipCatalogSchema,
  RelationshipDimensionSchema,
  type RelationshipCatalog,
  type RelationshipDimension,
  type PassengerRelationshipProfile,
} from '../../content/relationships/RelationshipContracts';
import { SocialKeySchema } from '../social/SocialStealthState';

export const RELATIONSHIP_STATE_SCHEMA_VERSION = 1 as const;

const relationshipValueSchema = z.number().min(0).max(100);
const humanAttitudeSchema = z.number().min(-100).max(100);

export const PassengerRelationshipStateSchema = z
  .object({
    passengerId: entityIdSchema('passenger'),
    trust: relationshipValueSchema.nullable(),
    affection: relationshipValueSchema.nullable(),
    humanAttitude: humanAttitudeSchema,
    completedRideIds: z.array(entityIdSchema('ride')),
    lastCompletedAt: GameTimeSchema.nullable(),
    lastTrustReason: SocialKeySchema.nullable(),
    lastAffectionReason: SocialKeySchema.nullable(),
    lastHumanAttitudeReason: SocialKeySchema.nullable(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (
      new Set(entry.completedRideIds).size !==
      entry.completedRideIds.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Completed relationship ride IDs must be unique.',
        path: ['completedRideIds'],
      });
    }

    if (
      entry.completedRideIds.length === 0 &&
      entry.lastCompletedAt !== null
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Relationship entry cannot have a last-completed time without completed rides.',
        path: ['lastCompletedAt'],
      });
    }

    if (
      entry.completedRideIds.length > 0 &&
      entry.lastCompletedAt === null
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Relationship entry with completed rides requires last-completed time.',
        path: ['lastCompletedAt'],
      });
    }
  });

export const RelationshipStateSchema = z
  .object({
    schemaVersion: z.literal(RELATIONSHIP_STATE_SCHEMA_VERSION),
    entries: z.array(PassengerRelationshipStateSchema),
  })
  .strict()
  .refine(
    (state) =>
      new Set(state.entries.map((entry) => entry.passengerId)).size ===
      state.entries.length,
    {
      message: 'Relationship state passenger entries must be unique.',
      path: ['entries'],
    },
  );

export type PassengerRelationshipState = z.infer<
  typeof PassengerRelationshipStateSchema
>;
export type RelationshipState = z.infer<
  typeof RelationshipStateSchema
>;

export function createInitialRelationshipState(): RelationshipState {
  return RelationshipStateSchema.parse({
    schemaVersion: RELATIONSHIP_STATE_SCHEMA_VERSION,
    entries: [],
  });
}

function clampRelationship(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function clampHumanAttitude(value: number): number {
  return Math.min(100, Math.max(-100, value));
}

export class RelationshipStateStore {
  readonly #catalog: RelationshipCatalog;
  #state: RelationshipState;

  public constructor(
    catalogInput: unknown,
    stateInput: unknown = createInitialRelationshipState(),
  ) {
    this.#catalog = RelationshipCatalogSchema.parse(catalogInput);
    this.#state = RelationshipStateSchema.parse(stateInput);

    for (const entry of this.#state.entries) {
      const profile = this.#requireProfile(entry.passengerId);
      this.#assertEntryMatchesProfile(entry, profile);
    }
  }

  public exportState(): RelationshipState {
    return RelationshipStateSchema.parse(this.#state);
  }

  public getMetric(
    passengerId: PassengerId,
    dimension: RelationshipDimension,
  ): number {
    const parsedDimension =
      RelationshipDimensionSchema.parse(dimension);
    const entry = this.#getOrCreateEntry(passengerId);
    const value = entry[parsedDimension];

    if (value === null) {
      throw new Error(
        `Relationship dimension ${parsedDimension} is not enabled for ${passengerId}.`,
      );
    }

    return value;
  }

  public adjustMetric(
    passengerId: PassengerId,
    dimension: RelationshipDimension,
    delta: number,
    reason: string,
  ): RelationshipState {
    const parsedDimension =
      RelationshipDimensionSchema.parse(dimension);
    const parsedDelta = z.number().min(-100).max(100).parse(delta);
    const parsedReason = SocialKeySchema.parse(reason);
    const entry = this.#getOrCreateEntry(passengerId);
    const current = entry[parsedDimension];

    if (current === null) {
      throw new Error(
        `Relationship dimension ${parsedDimension} is not enabled for ${passengerId}.`,
      );
    }

    const reasonField =
      parsedDimension === 'trust'
        ? 'lastTrustReason'
        : 'lastAffectionReason';

    this.#replaceEntry({
      ...entry,
      [parsedDimension]: clampRelationship(current + parsedDelta),
      [reasonField]: parsedReason,
    });

    return this.exportState();
  }

  public getHumanAttitude(passengerId: PassengerId): number {
    return this.#getOrCreateEntry(passengerId).humanAttitude;
  }

  public adjustHumanAttitude(
    passengerId: PassengerId,
    delta: number,
    reason: string,
  ): RelationshipState {
    const parsedDelta = z.number().min(-100).max(100).parse(delta);
    const parsedReason = SocialKeySchema.parse(reason);
    const entry = this.#getOrCreateEntry(passengerId);

    this.#replaceEntry({
      ...entry,
      humanAttitude: clampHumanAttitude(
        entry.humanAttitude + parsedDelta,
      ),
      lastHumanAttitudeReason: parsedReason,
    });

    return this.exportState();
  }

  public recordCompletedRide(
    rideId: RideId,
    passengerId: PassengerId,
    completedAt: GameTime,
  ): RelationshipState {
    const parsedTime = GameTimeSchema.parse(completedAt);
    const entry = this.#getOrCreateEntry(passengerId);

    if (entry.completedRideIds.includes(rideId)) {
      return this.exportState();
    }

    if (
      entry.lastCompletedAt !== null &&
      compareGameTime(parsedTime, entry.lastCompletedAt) < 0
    ) {
      throw new Error(
        `Relationship ride completion for ${passengerId} cannot move backward in game time.`,
      );
    }

    this.#replaceEntry({
      ...entry,
      completedRideIds: [...entry.completedRideIds, rideId],
      lastCompletedAt: parsedTime,
    });

    return this.exportState();
  }

  public getCompletedRideCount(passengerId: PassengerId): number {
    return this.#getOrCreateEntry(passengerId).completedRideIds.length;
  }

  public getLastCompletedAt(
    passengerId: PassengerId,
  ): GameTime | null {
    return this.#getOrCreateEntry(passengerId).lastCompletedAt;
  }

  public hasDimension(
    passengerId: PassengerId,
    dimension: RelationshipDimension,
  ): boolean {
    const profile = this.#requireProfile(passengerId);

    return profile[dimension] !== undefined;
  }

  #requireProfile(
    passengerId: PassengerId,
  ): PassengerRelationshipProfile {
    const profile = this.#catalog.profiles.find(
      (candidate) => candidate.passengerId === passengerId,
    );

    if (profile === undefined) {
      throw new Error(
        `No relationship profile is authored for ${passengerId}.`,
      );
    }

    return profile;
  }

  #getOrCreateEntry(
    passengerId: PassengerId,
  ): PassengerRelationshipState {
    const existing = this.#state.entries.find(
      (entry) => entry.passengerId === passengerId,
    );

    if (existing !== undefined) {
      return existing;
    }

    const profile = this.#requireProfile(passengerId);
    const created = PassengerRelationshipStateSchema.parse({
      passengerId,
      trust: profile.trust?.initialValue ?? null,
      affection: profile.affection?.initialValue ?? null,
      humanAttitude: profile.initialHumanAttitude,
      completedRideIds: [],
      lastCompletedAt: null,
      lastTrustReason: null,
      lastAffectionReason: null,
      lastHumanAttitudeReason: null,
    });

    this.#state = RelationshipStateSchema.parse({
      ...this.#state,
      entries: [...this.#state.entries, created],
    });

    return created;
  }

  #replaceEntry(entry: PassengerRelationshipState): void {
    this.#state = RelationshipStateSchema.parse({
      ...this.#state,
      entries: [
        ...this.#state.entries.filter(
          (candidate) =>
            candidate.passengerId !== entry.passengerId,
        ),
        entry,
      ],
    });
  }

  #assertEntryMatchesProfile(
    entry: PassengerRelationshipState,
    profile: PassengerRelationshipProfile,
  ): void {
    if ((entry.trust === null) !== (profile.trust === undefined)) {
      throw new Error(
        `Persisted trust dimension does not match relationship profile for ${entry.passengerId}.`,
      );
    }

    if (
      (entry.affection === null) !==
      (profile.affection === undefined)
    ) {
      throw new Error(
        `Persisted affection dimension does not match relationship profile for ${entry.passengerId}.`,
      );
    }
  }
}
