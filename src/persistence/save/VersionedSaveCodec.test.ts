import * as z from 'zod';
import { describe, expect, it } from 'vitest';
import { createInitialEconomyState } from '../../domain/economy/EconomyState';
import { createInitialAccessibilityPreferencesState } from '../../domain/preferences/AccessibilityPreferencesState';
import { createInitialRadioState } from '../../domain/radio/RadioState';
import { createInitialRelationshipState } from '../../domain/relationships/RelationshipState';
import { createInitialPersonalSpaceState } from '../../domain/spaces/PersonalSpaceState';
import { createInitialPersonalPersistenceState } from '../../domain/personal/PersonalPersistenceState';
import { createInitialTranslatorState } from '../../domain/translator/TranslatorState';
import {
  SaveVersionError,
  VersionedSaveCodec,
} from './VersionedSaveCodec';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  INITIAL_GAME_TIME,
  createInitialGameState,
  gameSaveCodec,
} from './gameSave';

const timestamp = '2026-10-04T07:00:00.000Z';

function currentEmptyState() {
  return {
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
  };
}

describe('gameSaveCodec', () => {
  it('round-trips the current production save envelope', () => {
    const initialState = createInitialGameState();
    const serialized = gameSaveCodec.serialize(initialState, timestamp);
    const decoded = gameSaveCodec.deserialize(serialized);

    expect(decoded).toEqual({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAt: timestamp,
      state: currentEmptyState(),
    });
  });

  it('migrates the v1 empty production state through every version into v11', () => {
    expect(
      gameSaveCodec.decode({
        schemaVersion: 1,
        savedAt: timestamp,
        state: {},
      }),
    ).toEqual({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAt: timestamp,
      state: currentEmptyState(),
    });
  });

  it('migrates v8 by adding deterministic relationship and accessibility state', () => {
    expect(
      gameSaveCodec.decode({
        schemaVersion: 8,
        savedAt: timestamp,
        state: {
          rideSession: null,
          socialState: null,
          translatorState: createInitialTranslatorState(),
          economyState: createInitialEconomyState(),
          radioState: createInitialRadioState(),
          personalSpaceState: createInitialPersonalSpaceState(),
          personalPersistenceState:
            createInitialPersonalPersistenceState(),
        },
      }),
    ).toEqual({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAt: timestamp,
      state: currentEmptyState(),
    });
  });

  it('migrates v10 by recovering time from ride and relationship records', () => {
    const older = {
      ...currentEmptyState(),
      gameTime: undefined,
      rideSession: {
        phase: 'assigned' as const,
        rideId: 'ride:older-night',
        jobId: 'job:older-night',
        passengerId: 'passenger:older-rider',
        pickupLocationId: 'location:older-pickup',
        destinationLocationId: 'location:older-destination',
        initialRouteId: 'route:older-route',
        acceptedAt: { day: 12, minuteOfDay: 320 },
        narrativeStoryId: 'older.story',
      },
      relationshipState: {
        schemaVersion: 1 as const,
        entries: [{
          passengerId: 'passenger:older-rider',
          trust: 25,
          affection: null,
          humanAttitude: 0,
          completedRideIds: ['ride:earlier'],
          lastCompletedAt: { day: 20, minuteOfDay: 444 },
          lastTrustReason: null,
          lastAffectionReason: null,
          lastHumanAttitudeReason: null,
        }],
      },
    };
    const v10: Record<string, unknown> = structuredClone(older);
    delete v10.gameTime;
    const result = gameSaveCodec.decode({
      schemaVersion: 10,
      savedAt: timestamp,
      state: v10,
    });
    expect(result.state.gameTime).toEqual({ day: 20, minuteOfDay: 444 });
    expect(result.state.rideSession?.phase).toBe('assigned');
  });

  it('migrates v9 by adding deterministic accessibility preferences', () => {
    expect(
      gameSaveCodec.decode({
        schemaVersion: 9,
        savedAt: timestamp,
        state: {
          rideSession: null,
          socialState: null,
          translatorState: createInitialTranslatorState(),
          economyState: createInitialEconomyState(),
          radioState: createInitialRadioState(),
          personalSpaceState: createInitialPersonalSpaceState(),
          personalPersistenceState:
            createInitialPersonalPersistenceState(),
          relationshipState: createInitialRelationshipState(),
        },
      }),
    ).toEqual({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAt: timestamp,
      state: currentEmptyState(),
    });
  });

  it('round-trips non-default accessibility preferences through the production save', () => {
    const state = createInitialGameState();
    const customized = {
      ...state,
      accessibilityPreferences: {
        ...state.accessibilityPreferences,
        uiScale: 1.4,
        motionIntensity: 0.25,
        contrastMode: 'high' as const,
        focusIndicator: 'always' as const,
        pointerSensitivity: 1.5,
        touchSensitivity: 0.75,
      },
    };
    const encoded = gameSaveCodec.encode(customized, timestamp);

    expect(gameSaveCodec.decode(encoded).state.accessibilityPreferences)
      .toEqual(customized.accessibilityPreferences);
  });

  it('rejects future saves instead of guessing how to read them', () => {
    expect(() =>
      gameSaveCodec.decode({
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION + 1,
        savedAt: timestamp,
        state: currentEmptyState(),
      }),
    ).toThrow(/newer than supported version/);
  });

  it('rejects malformed timestamps', () => {
    expect(() =>
      gameSaveCodec.encode(createInitialGameState(), 'today'),
    ).toThrow();
  });
});

describe('VersionedSaveCodec migration harness', () => {
  const StateV1Schema = z
    .object({
      credits: z.number().int().nonnegative(),
    })
    .strict();

  const StateV2Schema = z
    .object({
      credits: z.number().int().nonnegative(),
      currency: z.literal('credits'),
    })
    .strict();

  it('upgrades and validates every sequential save version', () => {
    const codec = new VersionedSaveCodec({
      currentVersion: 2,
      currentSchema: StateV2Schema,
      historicalVersions: [
        {
          version: 1,
          schema: StateV1Schema,
        },
      ],
      migrations: [
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (state) => {
            const oldState = StateV1Schema.parse(state);

            return {
              ...oldState,
              currency: 'credits' as const,
            };
          },
        },
      ],
    });

    const migrated = codec.decode({
      schemaVersion: 1,
      savedAt: timestamp,
      state: {
        credits: 12,
      },
    });

    expect(migrated).toEqual({
      schemaVersion: 2,
      savedAt: timestamp,
      state: {
        credits: 12,
        currency: 'credits',
      },
    });
  });

  it('fails closed when a migration step is missing', () => {
    const codec = new VersionedSaveCodec({
      currentVersion: 2,
      currentSchema: StateV2Schema,
      historicalVersions: [
        {
          version: 1,
          schema: StateV1Schema,
        },
      ],
    });

    expect(() =>
      codec.decode({
        schemaVersion: 1,
        savedAt: timestamp,
        state: {
          credits: 12,
        },
      }),
    ).toThrow(SaveVersionError);
  });
});
