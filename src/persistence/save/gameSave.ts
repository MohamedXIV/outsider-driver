import * as z from 'zod';
import { RideSessionSaveSchema } from '../../app/rides/RideSessionContracts';
import { SocialStealthStateSchema } from '../../domain/social/SocialStealthState';
import {
  TranslatorStateSchema,
  createInitialTranslatorState,
} from '../../domain/translator/TranslatorState';
import { VersionedSaveCodec } from './VersionedSaveCodec';

export const CURRENT_SAVE_SCHEMA_VERSION = 4 as const;

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

export type GameState = z.infer<typeof GameStateV4Schema>;

export const gameSaveCodec = new VersionedSaveCodec({
  currentVersion: CURRENT_SAVE_SCHEMA_VERSION,
  currentSchema: GameStateV4Schema,
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
  ],
});

export function createInitialGameState(): GameState {
  return GameStateV4Schema.parse({
    rideSession: null,
    socialState: null,
    translatorState: createInitialTranslatorState(),
  });
}
