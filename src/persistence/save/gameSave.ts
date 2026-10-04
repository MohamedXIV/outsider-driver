import * as z from 'zod';
import { VersionedSaveCodec } from './VersionedSaveCodec';

export const CURRENT_SAVE_SCHEMA_VERSION = 1 as const;

/**
 * The first real production save state. It is intentionally empty until the
 * first persistent gameplay modules land. Adding persisted fields requires a
 * deliberate schema-version change and migration rather than an unversioned
 * shape mutation.
 */
export const GameStateV1Schema = z.object({}).strict();
export type GameState = z.infer<typeof GameStateV1Schema>;

export const gameSaveCodec = new VersionedSaveCodec({
  currentVersion: CURRENT_SAVE_SCHEMA_VERSION,
  currentSchema: GameStateV1Schema,
});

export function createInitialGameState(): GameState {
  return GameStateV1Schema.parse({});
}
