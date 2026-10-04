import * as z from 'zod';
import { RideSessionSaveSchema } from '../../app/rides/RideSessionContracts';
import {
  EconomyStateSchema,
  createInitialEconomyState,
} from '../../domain/economy/EconomyState';
import { SocialStealthStateSchema } from '../../domain/social/SocialStealthState';
import {
  TranslatorStateSchema,
  createInitialTranslatorState,
} from '../../domain/translator/TranslatorState';
import { VersionedSaveCodec } from './VersionedSaveCodec';

export const CURRENT_SAVE_SCHEMA_VERSION = 5 as const;

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

export type GameState = z.infer<typeof GameStateV5Schema>;

export const gameSaveCodec = new VersionedSaveCodec({
  currentVersion: CURRENT_SAVE_SCHEMA_VERSION,
  currentSchema: GameStateV5Schema,
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
  ],
});

export function createInitialGameState(): GameState {
  return GameStateV5Schema.parse({
    rideSession: null,
    socialState: null,
    translatorState: createInitialTranslatorState(),
    economyState: createInitialEconomyState(),
  });
}
