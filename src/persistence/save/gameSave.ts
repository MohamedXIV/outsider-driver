import * as z from 'zod';
import { RideSessionSaveSchema } from '../../app/rides/RideSessionContracts';
import {
  EconomyStateSchema,
  createInitialEconomyState,
} from '../../domain/economy/EconomyState';
import {
  AccessibilityPreferencesStateSchema,
  createInitialAccessibilityPreferencesState,
} from '../../domain/preferences/AccessibilityPreferencesState';
import {
  RadioStateSchema,
  createInitialRadioState,
} from '../../domain/radio/RadioState';
import {
  RelationshipStateSchema,
  createInitialRelationshipState,
} from '../../domain/relationships/RelationshipState';
import {
  PersonalSpaceStateSchema,
  createInitialPersonalSpaceState,
} from '../../domain/spaces/PersonalSpaceState';
import {
  PersonalPersistenceStateSchema,
  createInitialPersonalPersistenceState,
} from '../../domain/personal/PersonalPersistenceState';
import { SocialStealthStateSchema } from '../../domain/social/SocialStealthState';
import {
  TranslatorStateSchema,
  createInitialTranslatorState,
} from '../../domain/translator/TranslatorState';
import {
  compareGameTime,
  GameTimeSchema,
  type GameTime,
} from '../../domain/time/GameTime';
import { VersionedSaveCodec } from './VersionedSaveCodec';

export const CURRENT_SAVE_SCHEMA_VERSION = 11 as const;

// Canonical initial shift begins during the authored Docks evening window.
// This is game-world time, never the computer's wall clock.
export const INITIAL_GAME_TIME: GameTime = GameTimeSchema.parse({
  day: 1,
  minuteOfDay: 18 * 60,
});

export const GameStateV1Schema = z.object({}).strict();

export const GameStateV2Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
  })
  .strict();

export const GameStateV3Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
  })
  .strict();

export const GameStateV4Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
    translatorState: TranslatorStateSchema,
  })
  .strict();

export const GameStateV5Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
    translatorState: TranslatorStateSchema,
    economyState: EconomyStateSchema,
  })
  .strict();

export const GameStateV6Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
    translatorState: TranslatorStateSchema,
    economyState: EconomyStateSchema,
    radioState: RadioStateSchema,
  })
  .strict();

export const GameStateV7Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
    translatorState: TranslatorStateSchema,
    economyState: EconomyStateSchema,
    radioState: RadioStateSchema,
    personalSpaceState: PersonalSpaceStateSchema,
  })
  .strict();

export const GameStateV8Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
    translatorState: TranslatorStateSchema,
    economyState: EconomyStateSchema,
    radioState: RadioStateSchema,
    personalSpaceState: PersonalSpaceStateSchema,
    personalPersistenceState: PersonalPersistenceStateSchema,
  })
  .strict();

export const GameStateV9Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
    translatorState: TranslatorStateSchema,
    economyState: EconomyStateSchema,
    radioState: RadioStateSchema,
    personalSpaceState: PersonalSpaceStateSchema,
    personalPersistenceState: PersonalPersistenceStateSchema,
    relationshipState: RelationshipStateSchema,
  })
  .strict();

export const GameStateV10Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
    socialState: SocialStealthStateSchema.nullable(),
    translatorState: TranslatorStateSchema,
    economyState: EconomyStateSchema,
    radioState: RadioStateSchema,
    personalSpaceState: PersonalSpaceStateSchema,
    personalPersistenceState: PersonalPersistenceStateSchema,
    relationshipState: RelationshipStateSchema,
    accessibilityPreferences:
      AccessibilityPreferencesStateSchema,
  })
  .strict();

export const GameStateV11Schema = GameStateV10Schema.extend({
  gameTime: GameTimeSchema,
}).strict();

export type GameState = z.infer<typeof GameStateV11Schema>;

/**
 * Historical v10 saves did not include the world's clock.
 * Reconstruct the latest known persisted time to avoid rewinding behind
 * active/completed rides or known relationship completions.
 * This is a bounded migration estimate, not retroactive simulated time.
 */
function deriveLegacyGameTime(
  previous: z.infer<typeof GameStateV10Schema>,
): GameTime {
  const observed: GameTime[] = [INITIAL_GAME_TIME];
  const ride = previous.rideSession;
  if (ride !== null) {
    observed.push(ride.acceptedAt);
    if (ride.phase !== 'assigned') {
      observed.push(ride.startedAt);
    }
    if (ride.phase === 'completed') {
      observed.push(ride.completedAt);
    }
  }
  for (const entry of previous.relationshipState.entries) {
    if (entry.lastCompletedAt !== null) {
      observed.push(entry.lastCompletedAt);
    }
  }
  return observed.reduce((latest, current) =>
    compareGameTime(current, latest) > 0 ? current : latest,
  );
}

export const gameSaveCodec = new VersionedSaveCodec({
  currentVersion: CURRENT_SAVE_SCHEMA_VERSION,
  currentSchema: GameStateV11Schema,
  historicalVersions: [
    {
      version: 1,
      schema: GameStateV1Schema,
    },
    {
      version: 2,
      schema: GameStateV2Schema,
    },
    {
      version: 3,
      schema: GameStateV3Schema,
    },
    {
      version: 4,
      schema: GameStateV4Schema,
    },
    {
      version: 5,
      schema: GameStateV5Schema,
    },
    {
      version: 6,
      schema: GameStateV6Schema,
    },
    {
      version: 7,
      schema: GameStateV7Schema,
    },
    {
      version: 8,
      schema: GameStateV8Schema,
    },
    {
      version: 9,
      schema: GameStateV9Schema,
    },
    {
      version: 10,
      schema: GameStateV10Schema,
    },
  ],
  migrations: [
    {
      fromVersion: 1,
      toVersion: 2,
      migrate: (state) => {
        GameStateV1Schema.parse(state);

        return {
          rideSession: null,
        };
      },
    },
    {
      fromVersion: 2,
      toVersion: 3,
      migrate: (state) => {
        const v2 = GameStateV2Schema.parse(state);

        return {
          ...v2,
          socialState: null,
        };
      },
    },
    {
      fromVersion: 3,
      toVersion: 4,
      migrate: (state) => {
        const v3 = GameStateV3Schema.parse(state);

        return {
          ...v3,
          translatorState: createInitialTranslatorState(),
        };
      },
    },
    {
      fromVersion: 4,
      toVersion: 5,
      migrate: (state) => {
        const v4 = GameStateV4Schema.parse(state);

        return {
          ...v4,
          economyState: createInitialEconomyState(),
        };
      },
    },
    {
      fromVersion: 5,
      toVersion: 6,
      migrate: (state) => {
        const v5 = GameStateV5Schema.parse(state);

        return {
          ...v5,
          radioState: createInitialRadioState(),
        };
      },
    },
    {
      fromVersion: 6,
      toVersion: 7,
      migrate: (state) => {
        const v6 = GameStateV6Schema.parse(state);

        return {
          ...v6,
          personalSpaceState: createInitialPersonalSpaceState(),
        };
      },
    },
    {
      fromVersion: 7,
      toVersion: 8,
      migrate: (state) => {
        const v7 = GameStateV7Schema.parse(state);

        return {
          ...v7,
          personalPersistenceState:
            createInitialPersonalPersistenceState(),
        };
      },
    },
    {
      fromVersion: 8,
      toVersion: 9,
      migrate: (state) => {
        const v8 = GameStateV8Schema.parse(state);

        return {
          ...v8,
          relationshipState: createInitialRelationshipState(),
        };
      },
    },
    {
      fromVersion: 9,
      toVersion: 10,
      migrate: (state) => {
        const v9 = GameStateV9Schema.parse(state);

        return {
          ...v9,
          accessibilityPreferences:
            createInitialAccessibilityPreferencesState(),
        };
      },
    },
    {
      fromVersion: 10,
      toVersion: 11,
      migrate: (state) => {
        const v10 = GameStateV10Schema.parse(state);
        return {
          ...v10,
          gameTime: deriveLegacyGameTime(v10),
        };
      },
    },
  ],
});

export function createInitialGameState(): GameState {
  return GameStateV11Schema.parse({
    rideSession: null,
    gameTime: INITIAL_GAME_TIME,
    socialState: null,
    translatorState: createInitialTranslatorState(),
    economyState: createInitialEconomyState(),
    radioState: createInitialRadioState(),
    personalSpaceState: createInitialPersonalSpaceState(),
    personalPersistenceState:
      createInitialPersonalPersistenceState(),
    relationshipState: createInitialRelationshipState(),
    accessibilityPreferences:
      createInitialAccessibilityPreferencesState(),
  });
}
