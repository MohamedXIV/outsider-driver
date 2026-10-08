import { gameSaveCodec, type GameState } from '../../persistence/save/gameSave';
import type { GameSessionPersistence } from './GameSession';

export const GAME_SAVE_STORAGE_KEY = 'outsider-driver.game-save.v1';

export interface GameSaveKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Do not silently remove an invalid or future-version save. The original bytes
 * must remain available so the player can recover them after an upgrade.
 */
export class BrowserGameSaveStorage implements GameSessionPersistence {
  readonly #storage: GameSaveKeyValueStorage;
  readonly #now: () => string;

  public constructor(
    storage: GameSaveKeyValueStorage = window.localStorage,
    now: () => string = () => new Date().toISOString(),
  ) {
    this.#storage = storage;
    this.#now = now;
  }

  public load(): GameState | null {
    const raw = this.#storage.getItem(GAME_SAVE_STORAGE_KEY);

    return raw === null
      ? null
      : gameSaveCodec.deserialize(raw).state;
  }

  public save(state: GameState): void {
    const serialized = gameSaveCodec.serialize(state, this.#now());
    this.#storage.setItem(GAME_SAVE_STORAGE_KEY, serialized);
  }
}
