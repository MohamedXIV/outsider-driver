import { describe, expect, it, vi } from 'vitest';
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

  it('projects locked work with reasons but never grants it as available', () => {
    const session = GameSession.open(persistence(new MemoryStorage()));
    const offered = session.listWorkOffers();
    expect(offered).toHaveLength(2);
    const official = offered.find((x) => x.job.id === 'job:docks-official-clinic');
    expect(official?.eligible).toBe(false);
    expect(official?.reasons).toContain('cover:work-permit');
    expect(session.listAvailableWork().map((x) => x.job.id)).toEqual([
      'job:docks-underground-clinic',
    ]);
    if (official === undefined) throw new Error('Missing official offer');
    official.reasons[0] = 'fabricated';
    official.job.fare.baseCredits = 99999;
    expect(session.listWorkOffers().find((x) => x.job.id === official.job.id)?.reasons)
      .toContain('cover:work-permit');
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

  it('accepts an eligible authored job as a durable assigned ride, rejecting duplicates', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    const underground = entityId('job', 'docks-underground-clinic');
    const official = entityId('job', 'docks-official-clinic');

    // A bare domain session has no personal-space location (taxi state).
    // Real browser startup moves new games home through PlayerShiftController.
    session.execute({
      type: 'space.enter',
      spaceId: entityId('personal-space', 'home'),
    });
    expect(() => session.execute({ type: 'ride.accept', jobId: underground }))
      .toThrow(/Enter the taxi/i);
    expect(() => session.execute({ type: 'ride.accept', jobId: official }))
      .toThrow(/Enter the taxi/i);

    session.execute({ type: 'space.enter', spaceId: entityId('personal-space', 'garage') });
    session.execute({ type: 'space.leave' });
    expect(() => session.execute({ type: 'ride.accept', jobId: official }))
      .toThrow(/cover:work-permit/);

    const accepted = session.execute({ type: 'ride.accept', jobId: underground });
    expect(accepted.rideSession).toMatchObject({
      phase: 'assigned',
      jobId: underground,
      acceptedAt: { day: 1, minuteOfDay: 1080 },
    });
    expect(accepted.rideSession?.rideId).toBe(
      'ride:docks-underground-clinic-d1-m1080',
    );
    expect(() => session.execute({ type: 'ride.accept', jobId: underground }))
      .toThrow(/already assigned or active/i);
    expect(() => session.execute({ type: 'time.advance', minutes: 1 }))
      .toThrow(/unfinished ride/);
    const before = session.exportState();

    session.dispose();
    const restored = GameSession.open(persistence(memory));
    expect(restored.exportState()).toEqual(before);
    restored.dispose();
  });

  it('registers a player-selected alias without fabricating credentials and runs actual Ink dialogue', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));

    expect(() => session.execute({
      type: 'identity.register',
      displayName: '  ',
    })).toThrow();
    expect(session.exportState().socialState).toBeNull();

    session.execute({
      type: 'identity.register',
      displayName: 'Night Driver',
    });
    const social = session.exportState().socialState;
    expect(social?.coverIdentity.displayName).toBe('Night Driver');
    expect(social?.coverIdentity.attributes).toEqual([]);
    expect(session.listAvailableWork().map((x) => x.job.id)).not.toContain(
      'job:docks-official-clinic',
    );
    expect(() => session.execute({
      type: 'identity.register',
      displayName: 'Another Driver',
    })).toThrow(/already registered/);

    session.execute({
      type: 'ride.accept',
      jobId: entityId('job', 'docks-underground-clinic'),
    });
    session.execute({ type: 'ride.pickup' });
    const pickedUp = session.exportState();
    expect(pickedUp.rideSession?.phase).toBe('active');
    expect(pickedUp.socialState?.knownFactIds).toContain(
      'fact:docks-checkpoint-rumor',
    );
    expect(session.getRidePresentation()?.dialogue?.choices).toHaveLength(2);
    session.execute({ type: 'ride.choose-dialogue', choiceIndex: 0 });
    expect(session.exportState().socialState?.cityAttention.value).toBe(1);
    expect(session.getRidePresentation()?.dialogue?.ended).toBe(true);

    const beforeReload = session.exportState();
    session.dispose();
    const restored = GameSession.open(persistence(memory));
    expect(restored.exportState()).toEqual(beforeReload);
    expect(restored.getRidePresentation()?.dialogue?.ended).toBe(true);
    restored.dispose();
  });

  it('never persists failed dialogue choices or replays narrative effects', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    session.execute({ type: 'identity.register', displayName: 'Cover' });
    session.execute({
      type: 'ride.accept',
      jobId: entityId('job', 'docks-underground-clinic'),
    });
    session.execute({ type: 'ride.pickup' });
    const baseline = session.exportState();
    expect(() => session.execute({
      type: 'ride.choose-dialogue',
      choiceIndex: 999,
    })).toThrow(/choice index/i);
    expect(session.exportState()).toEqual(baseline);

    memory.rejectWrites = true;
    expect(() => session.execute({
      type: 'ride.choose-dialogue',
      choiceIndex: 0,
    })).toThrow(/Storage quota exceeded/);
    expect(session.exportState()).toEqual(baseline);
    session.dispose();
  });

  it('finishes an authored shift with checkpoint pause, persistent clock and atomic fare', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    const jobId = entityId('job', 'docks-underground-clinic');
    session.execute({ type: 'identity.register', displayName: 'Docks Driver' });
    session.execute({ type: 'ride.accept', jobId });
    session.execute({ type: 'ride.pickup' });
    session.execute({ type: 'ride.choose-dialogue', choiceIndex: 0 });

    expect(() => session.execute({ type: 'ride.drop-off' }))
      .toThrow(/route must arrive/i);
    session.execute({ type: 'ride.advance', seconds: 3 });
    const atCheckpoint = session.exportState();
    expect(atCheckpoint.gameTime).toEqual({ day: 1, minuteOfDay: 18 * 60 + 5 });
    expect(session.getRidePresentation()?.pausedRouteEvent).toMatchObject({
      type: 'route.checkpoint',
      checkpointId: 'customs-light',
    });
    expect(() => session.execute({ type: 'ride.advance', seconds: 3 }))
      .toThrow(/paused route event/i);
    expect(session.exportState()).toEqual(atCheckpoint);

    session.dispose();
    const restored = GameSession.open(persistence(memory));
    expect(restored.getRidePresentation()?.pausedRouteEvent?.type).toBe('route.checkpoint');
    expect(restored.getProjection().gameTime.minuteOfDay).toBe(1085);
    restored.execute({ type: 'ride.resolve-event', resolution: { type: 'continue' } });
    restored.execute({ type: 'ride.advance', seconds: 3 });
    expect(restored.getRidePresentation()).toMatchObject({
      phase: 'dropoff-ready',
      routeProgress: 1,
      canDropOff: true,
    });
    expect(restored.getProjection().gameTime.minuteOfDay).toBe(1088);
    expect(restored.exportState().economyState.credits).toBe(0);

    const priorCompletion = restored.exportState();
    memory.rejectWrites = true;
    expect(() => restored.execute({ type: 'ride.drop-off' }))
      .toThrow(/Storage quota exceeded/);
    expect(restored.exportState()).toEqual(priorCompletion);
    memory.rejectWrites = false;

    const completed = restored.execute({ type: 'ride.drop-off' });
    expect(completed.rideSession?.phase).toBe('completed');
    expect(completed.gameTime.minuteOfDay).toBe(1088);
    // Gross: 56 base + 8*4 per-minute + 12 bonus = 100.
    // Expense: 10 dispatch + 8*1 per-minute = 18.
    expect(completed.economyState.credits).toBe(82);
    expect(completed.economyState.undergroundAccess).toBe(3);
    expect(completed.economyState.settledRideIds).toEqual([
      'ride:docks-underground-clinic-d1-m1080',
    ]);
    expect(completed.relationshipState.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          passengerId: 'passenger:underground-clinic-rider',
          completedRideIds: ['ride:docks-underground-clinic-d1-m1080'],
        }),
      ]),
    );
    expect(() => restored.execute({ type: 'ride.drop-off' }))
      .toThrow(/route must arrive/i);

    restored.execute({
      type: 'space.enter',
      spaceId: entityId('personal-space', 'garage'),
    });
    restored.execute({
      type: 'space.enter',
      spaceId: entityId('personal-space', 'home'),
    });
    restored.dispose();

    const home = GameSession.open(persistence(memory));
    expect(home.exportState().rideSession?.phase).toBe('completed');
    expect(home.getProjection()).toMatchObject({
      credits: 82,
      currentSpaceId: 'personal-space:home',
      gameTime: { day: 1, minuteOfDay: 1088 },
    });
    home.dispose();
  });

  it('rejects checkpoint bypasses and teleportation without changing persistent state', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    session.execute({ type: 'identity.register', displayName: 'Guarded Driver' });
    session.execute({
      type: 'ride.accept',
      jobId: entityId('job', 'docks-underground-clinic'),
    });
    session.execute({ type: 'ride.pickup' });
    session.execute({ type: 'ride.advance', seconds: 3 });

    const atCheckpoint = session.exportState();
    expect(session.getRidePresentation()?.pausedRouteEvent?.type).toBe(
      'route.checkpoint',
    );
    expect(() => session.execute({
      type: 'ride.resolve-event',
      resolution: { type: 'choose', choiceId: 'unsupported-detour' },
    })).toThrow(/Checkpoint events only accept continue/);
    expect(session.exportState()).toEqual(atCheckpoint);

    expect(() => session.execute({
      type: 'space.enter',
      spaceId: entityId('personal-space', 'garage'),
    })).toThrow(/Finish the active ride/);
    expect(session.exportState()).toEqual(atCheckpoint);

    session.execute({
      type: 'ride.resolve-event',
      resolution: { type: 'continue' },
    });
    expect(session.getRidePresentation()?.pausedRouteEvent).toBeNull();
    session.dispose();
  });

  it('rolls back route progress and world clock when saving a drive step fails', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    session.execute({ type: 'identity.register', displayName: 'Recovery Driver' });
    session.execute({
      type: 'ride.accept',
      jobId: entityId('job', 'docks-underground-clinic'),
    });
    session.execute({ type: 'ride.pickup' });
    const before = session.exportState();
    memory.rejectWrites = true;
    expect(() => session.execute({
      type: 'ride.advance',
      seconds: 3,
    })).toThrow(/Storage quota exceeded/);
    expect(session.exportState()).toEqual(before);

    memory.rejectWrites = false;
    session.execute({ type: 'ride.advance', seconds: 3 });
    expect(session.getProjection().gameTime.minuteOfDay).toBe(1085);
    expect(session.getRidePresentation()?.pausedRouteEvent?.type)
      .toBe('route.checkpoint');
    session.dispose();
  });

  it('uses absolute route position so repeated sub-minute steps do not lose time', () => {
    const session = GameSession.open(persistence(new MemoryStorage()));
    session.execute({ type: 'identity.register', displayName: 'Driver' });
    session.execute({
      type: 'ride.accept', jobId: entityId('job', 'docks-underground-clinic'),
    });
    session.execute({ type: 'ride.pickup' });
    for (let i = 0; i < 4; i += 1) {
      session.execute({ type: 'ride.advance', seconds: 0.2 });
    }
    expect(session.getProjection().gameTime.minuteOfDay).toBe(1081);
    const saved = session.exportState();
    expect(saved.rideSession?.phase).toBe('active');
    session.dispose();
  });

  it('rolls back a dispatched ride if storage fails', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    session.execute({ type: 'space.leave' });
    const before = session.exportState();
    memory.rejectWrites = true;
    expect(() => session.execute({
      type: 'ride.accept',
      jobId: entityId('job', 'docks-underground-clinic'),
    })).toThrow(/Storage quota exceeded/);
    expect(session.exportState()).toEqual(before);
    session.dispose();
  });

  it('returns independent work snapshots and keeps observers away from canonical state', () => {
    const session = GameSession.open(persistence(new MemoryStorage()));
    const available = session.listAvailableWork();
    const underground = available.find(
      ({ job }) => job.id === 'job:docks-underground-clinic',
    );
    expect(underground).toBeDefined();
    const originalFare = underground?.job.fare.baseCredits;
    if (underground === undefined) throw new Error('Missing authored underground job');

    underground.job.fare.baseCredits = 99999;
    const second = session.listAvailableWork();
    expect(second.find(({ job }) => job.id === underground.job.id)
      ?.job.fare.baseCredits).toBe(originalFare);

    session.subscribe((state) => {
      state.radioState.listening = true;
    });
    expect(session.exportState().radioState.listening).toBe(false);

    session.execute({ type: 'radio.listen', listening: false });
    expect(session.exportState().radioState.listening).toBe(false);
    session.dispose();
  });

  it('never leaks the mutable persisted snapshot through command results', () => {
    const session = GameSession.open(persistence(new MemoryStorage()));
    const returned = session.execute({ type: 'radio.listen', listening: true });
    returned.radioState.listening = false;
    returned.gameTime.day = 500;
    expect(session.exportState().radioState.listening).toBe(true);
    expect(session.getProjection().gameTime.day).toBe(1);
    session.dispose();
  });

  it('unsubscribes callbacks that throw during initial delivery', () => {
    const session = GameSession.open(persistence(new MemoryStorage()));
    expect(() => session.subscribe(() => {
      throw new Error('Listener failed');
    })).toThrow(/Listener failed/);
    expect(() => session.execute({ type: 'radio.listen', listening: true }))
      .not.toThrow();
    session.dispose();
  });

  it('keeps successful commands committed even when a later observer fails', () => {
    const memory = new MemoryStorage();
    const session = GameSession.open(persistence(memory));
    let notificationCount = 0;
    let shouldThrow = false;
    session.subscribe(() => {
      notificationCount += 1;
      if (shouldThrow) throw new Error('broken presentation');
    });
    shouldThrow = true;
    const errorLogger = vi.spyOn(console, 'error').mockImplementation(() => { return; });
    try {
      expect(() => session.execute({ type: 'radio.listen', listening: true }))
        .not.toThrow();
      expect(notificationCount).toBe(2);
      session.execute({ type: 'radio.listen', listening: false });
      expect(notificationCount).toBe(2);
    } finally {
      errorLogger.mockRestore();
    }
    expect(memory.getItem(GAME_SAVE_STORAGE_KEY)).not.toBeNull();
    expect(session.exportState().radioState.listening).toBe(false);
    session.dispose();
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
