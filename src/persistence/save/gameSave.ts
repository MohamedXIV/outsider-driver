import * as z from 'zod';
import { RideSessionSaveSchema } from '../../app/rides/RideSessionContracts';
import { SocialStealthStateSchema } from '../../domain/social/SocialStealthState';
import { VersionedSaveCodec } from './VersionedSaveCodec';

export const CURRENT_SAVE_SCHEMA_VERSION = 3 as const;

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

export type GameState = z.infer<typeof GameStateV3Schema>;

export const gameSaveCodec = new VersionedSaveCodec({
  currentVersion: CURRENT_SAVE_SCHEMA_VERSION,
  currentSchema: GameStateV3Schema,
  historicalVersions: [
    {
      version: 1,
      schema: GameStateV1Schema,
    },
    {
      version: 2,
      schema: GameStateV2Schema,
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
  ],
});

export function createInitialGameState(): GameState {
  return GameStateV3Schema.parse({
    rideSession: null,
    socialState: null,
  });
}
