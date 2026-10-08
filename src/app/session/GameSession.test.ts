import { describe, expect, it } from 'vitest';
import { entityId } from '../../domain/ids/EntityId';
import {
  createInitialGameState,
  gameSaveCodec,
  type GameState,
} from '../../persistence/save/gameSave';
import {
  BrowserGameSaveStorage,
  GAME_SAVE_STORAGE_KEY,
  type GameSaveKeyValueStorage,
} from './BrowserGameSaveStorage';
import { GameSession } from './GameSession';

class MemoryStorage implements GameSaveKeyValueStorage {
  readonly values = new Map<string, string>();
  rejectWrites = false;

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    if (this.rejectWrites) {
      throw new Error('Storage quota exceeded');
    }
    this.values.set(key, value);
  }
}

function persistence(storage: MemoryStorage) {
  return new BrowserGameSaveStorage(
    storage,
    () => '2026-10-08T12:00:00.000Z',
  );
}

describe('production GameSession', () => {
  it('boots canonical new state, exposes a readonly projection, and restores commands', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));

    expect(session.wasRestored()).toBe(false);
    expect(session.exportState()).toEqual(createInitialGameState());
    expect(session.getProjection()).toMatchObject({
      credits: 0,
      gameTime: { day: 1, minuteOfDay: 18 * 60 },
      currentSpaceId: null,
      activeRidePhase: null,
      hasCoverIdentity: false,
    });

    const home = entityId('personal-space', 'home');
    session.execute({ type: 'space.enter', spaceId: home });
    session.execute({ type: 'space.set-flag', spaceId: home, flagId: 'message-indicator', value: true });
    session.execute({ type: 'radio.tune', stationId: entityId('radio-station', 'civic-one') });
    session.execute({ type: 'radio.listen', listening: true });

    const exported = session.exportState();
    expect(exported.personalSpaceState.currentSpaceId).toBe(home);
    expect(exported.radioState.listening).toBe(true);
    expect(exported.radioState.tunedStationId).toBe('radio-station:civic-one');

    const serialized = memory.getItem(GAME_SAVE_STORAGE_KEY);
    expect(serialized).not.toBeNull();
    expect(gameSaveCodec.deserialize(serialized ?? '').state).toEqual(exported);

    session.dispose();
    const restored = GameSession.open(persistence(memory));
    expect(restored.wasRestored()).toBe(true);
    expect(restored.exportState()).toEqual(exported);
    restored.execute({ type: 'space.leave' });
    expect(restored.getProjection().currentSpaceId).toBeNull();
    restored.dispose();
  });

  it('preserves malformed and newer-version saves without silent reset or overwrite', () => {
    for (const raw of [
      '{broken json',
      JSON.stringify({
        schemaVersion: 999,
        savedAt: '2026-10-08T12:00:00.000Z',
        state: {},
      }),
    ]) {
      const memory = new MemoryStorage();
      memory.values.set(GAME_SAVE_STORAGE_KEY, raw);

      expect(() => GameSession.open(persistence(memory))).toThrow();
      expect(memory.getItem(GAME_SAVE_STORAGE_KEY)).toBe(raw);
    }
  });

  it('migrates a valid historical envelope through the existing codec', () => {
    const memory = new MemoryStorage();
    memory.values.set(GAME_SAVE_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      savedAt: '2026-10-08T12:00:00.000Z',
      state: {},
    }));
    const session = GameSession.open(persistence(memory));
    expect(session.exportState()).toEqual(createInitialGameState());
    session.dispose();
  });

  it('rolls back in-memory mutations when durable save fails', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    const before = session.exportState();
    memory.rejectWrites = true;

    expect(() => session.execute({
      type: 'space.enter',
      spaceId: entityId('personal-space', 'garage'),
    })).toThrow(/quota/i);
    expect(session.exportState()).toEqual(before);
    expect(memory.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
    session.dispose();
  });

  it('enforces existing cover/work eligibility instead of granting fabricated permits', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    const before = session.exportState();

    expect(() => session.execute({
      type: 'translator.activate',
      packId: entityId('translator-pack', 'civic-basic-v1'),
    })).toThrow(/unowned/i);
    expect(session.exportState()).toEqual(before);
    const offered = session.listAvailableWork();
    expect(offered.some(({ job }) => job.id === 'job:docks-underground-clinic')).toBe(true);
    expect(offered.some(({ job }) => job.id === 'job:docks-official-clinic')).toBe(false);
    session.dispose();
  });

  it('advances and persists the authoritative world clock and uses it for job windows', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    expect(session.listAvailableWork()).toHaveLength(1);

    session.execute({ type: 'time.advance', minutes: 24 * 60 });
    expect(session.getProjection().gameTime).toEqual({
      day: 2, minuteOfDay: 18 * 60,
    });
    expect(session.listAvailableWork()).toHaveLength(0);

    session.dispose();
    const restored = GameSession.open(persistence(memory));
    expect(restored.getProjection().gameTime).toEqual({
      day: 2, minuteOfDay: 18 * 60,
    });
    expect(() => restored.execute({
      type: 'time.advance', minutes: -1,
    })).toThrow();
    restored.dispose();
  });

  it('publishes state after successful persistence and disallows use after disposal', () => {
    const session = GameSession.open(persistence(new MemoryStorage()));
    const observed: GameState[] = [];
    const unsubscribe = session.subscribe((state) => {
      observed.push(state);
    });

    session.execute({ type: 'radio.listen', listening: true });
    expect(observed).toHaveLength(2);
    expect(observed[1]?.radioState.listening).toBe(true);
    unsubscribe();
    session.dispose();

    expect(() => session.exportState()).toThrow(/disposed/i);
    expect(() => session.execute({ type: 'space.leave' })).toThrow(/disposed/i);
  });
});
