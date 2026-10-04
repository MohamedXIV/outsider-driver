import * as z from 'zod';
import { RideSessionSaveSchema } from '../../app/rides/RideSessionContracts';
import { VersionedSaveCodec } from './VersionedSaveCodec';

export const CURRENT_SAVE_SCHEMA_VERSION = 2 as const;

export const GameStateV1Schema = z.object({}).strict();

export const GameStateV2Schema = z
  .object({
    rideSession: RideSessionSaveSchema.nullable(),
  })
  .strict();

export type GameState = z.infer<typeof GameStateV2Schema>;

export const gameSaveCodec = new VersionedSaveCodec({
  currentVersion: CURRENT_SAVE_SCHEMA_VERSION,
  currentSchema: GameStateV2Schema,
  historicalVersions: [
    {
      version: 1,
      schema: GameStateV1Schema,
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
  ],
});

export function createInitialGameState(): GameState {
  return GameStateV2Schema.parse({
    rideSession: null,
  });
}
