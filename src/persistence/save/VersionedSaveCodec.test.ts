import * as z from 'zod';
import { describe, expect, it } from 'vitest';
import { createInitialEconomyState } from '../../domain/economy/EconomyState';
import { createInitialRadioState } from '../../domain/radio/RadioState';
import { createInitialPersonalSpaceState } from '../../domain/spaces/PersonalSpaceState';
import { createInitialPersonalPersistenceState } from '../../domain/personal/PersonalPersistenceState';
import { createInitialTranslatorState } from '../../domain/translator/TranslatorState';
import {
  SaveVersionError,
  VersionedSaveCodec,
} from './VersionedSaveCodec';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  createInitialGameState,
  gameSaveCodec,
} from './gameSave';

const timestamp = '2026-10-04T07:00:00.000Z';

function currentEmptyState() {
  return {
    rideSession: null,
    socialState: null,
    translatorState: createInitialTranslatorState(),
    economyState: createInitialEconomyState(),
    radioState: createInitialRadioState(),
    personalSpaceState: createInitialPersonalSpaceState(),
    personalPersistenceState:
      createInitialPersonalPersistenceState(),
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

  it('migrates the v1 empty production state through every version into v8', () => {
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

  it('migrates v6 by adding deterministic personal-space and personal-persistence state', () => {
    expect(
      gameSaveCodec.decode({
        schemaVersion: 6,
        savedAt: timestamp,
        state: {
          rideSession: null,
          socialState: null,
          translatorState: createInitialTranslatorState(),
          economyState: createInitialEconomyState(),
          radioState: createInitialRadioState(),
        },
      }),
    ).toEqual({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAt: timestamp,
      state: currentEmptyState(),
    });
  });

  it('migrates v7 by adding deterministic personal persistence state', () => {
    expect(
      gameSaveCodec.decode({
        schemaVersion: 7,
        savedAt: timestamp,
        state: {
          rideSession: null,
          socialState: null,
          translatorState: createInitialTranslatorState(),
          economyState: createInitialEconomyState(),
          radioState: createInitialRadioState(),
          personalSpaceState: createInitialPersonalSpaceState(),
        },
      }),
    ).toEqual({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAt: timestamp,
      state: currentEmptyState(),
    });
  });

  it('rejects future saves instead of guessing how to read them', () => {
    expect(() =>
      gameSaveCodec.decode({
        schemaVersion: 9,
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
