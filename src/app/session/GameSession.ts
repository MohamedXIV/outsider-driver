import { productionContent } from '../../content/production/ProductionContent';
import { validatePassengerCatalog } from '../../content/passengers/PassengerContracts';
import { validateTranslatorCatalog } from '../../content/translator/TranslatorContracts';
import { validateWorldContentCatalog } from '../../content/world/WorldContracts';
import { EconomyStateStore } from '../../domain/economy/EconomyState';
import type { PersonalSpaceId, RadioStationId, TranslatorPackId } from '../../domain/ids/EntityId';
import { PersonalPersistenceStateStore } from '../../domain/personal/PersonalPersistenceState';
import {
  AccessibilityPreferencesStateSchema,
  type AccessibilityPreferencesState,
} from '../../domain/preferences/AccessibilityPreferencesState';
import { RadioStateStore } from '../../domain/radio/RadioState';
import { RelationshipStateStore } from '../../domain/relationships/RelationshipState';
import { SocialStealthStateStore } from '../../domain/social/SocialStealthState';
import { PersonalSpaceStateStore } from '../../domain/spaces/PersonalSpaceState';
import {
  advanceGameTime,
  type GameTime,
} from '../../domain/time/GameTime';
import { TranslatorStateStore } from '../../domain/translator/TranslatorState';
import { JobContractSchema } from '../../domain/work/JobRideContracts';
import {
  GameStateV11Schema,
  createInitialGameState,
  type GameState,
} from '../../persistence/save/gameSave';
import { WorkNetwork, createWorkEligibilityContext } from '../work/WorkNetwork';

export interface GameSessionPersistence {
  load(): GameState | null;
  save(state: GameState): void;
}

export type GameSessionCommand =
  | { readonly type: 'space.enter'; readonly spaceId: PersonalSpaceId }
  | { readonly type: 'space.leave' }
  | { readonly type: 'space.set-flag'; readonly spaceId: PersonalSpaceId; readonly flagId: string; readonly value: boolean }
  | { readonly type: 'time.advance'; readonly minutes: number }
  | { readonly type: 'radio.tune'; readonly stationId: RadioStationId }
  | { readonly type: 'radio.listen'; readonly listening: boolean }
  | { readonly type: 'translator.activate'; readonly packId: TranslatorPackId }
  | { readonly type: 'translator.deactivate'; readonly packId: TranslatorPackId }
  | { readonly type: 'preferences.update'; readonly preferences: AccessibilityPreferencesState };

export interface GameSessionProjection {
  readonly gameTime: GameTime;
  readonly credits: number;
  readonly currentSpaceId: PersonalSpaceId | null;
  readonly activeRidePhase: NonNullable<GameState['rideSession']>['phase'] | null;
  readonly hasCoverIdentity: boolean;
  readonly tunedRadioStationId: RadioStationId | null;
  readonly radioListening: boolean;
  readonly ownedTranslatorPackCount: number;
  readonly activeTranslatorPackCount: number;
}

interface Stores {
  readonly economy: EconomyStateStore;
  readonly spaces: PersonalSpaceStateStore;
  readonly personal: PersonalPersistenceStateStore;
  readonly social: SocialStealthStateStore | null;
  readonly translator: TranslatorStateStore;
  readonly radio: RadioStateStore;
  readonly relationships: RelationshipStateStore;
}

function composeStores(state: GameState): Stores {
  const passengers = validatePassengerCatalog(productionContent.passengers);
  const translator = validateTranslatorCatalog(productionContent.translator);
  const world = validateWorldContentCatalog(productionContent.world);
  const jobs = productionContent.jobs.map((job) => JobContractSchema.parse(job));

  return {
    economy: new EconomyStateStore(state.economyState),
    spaces: new PersonalSpaceStateStore(
      productionContent.personalSpaces,
      state.personalSpaceState,
    ),
    personal: new PersonalPersistenceStateStore(
      productionContent.personalPersistence,
      passengers,
      state.personalPersistenceState,
    ),
    social: state.socialState === null
      ? null
      : new SocialStealthStateStore(state.socialState),
    translator: new TranslatorStateStore(translator, state.translatorState),
    radio: new RadioStateStore(
      productionContent.radio,
      { translator, world, jobs, passengers },
      state.radioState,
    ),
    relationships: new RelationshipStateStore(
      productionContent.relationships,
      state.relationshipState,
    ),
  };
}

/**
 * One authoritative session for production domain state and versioned saves.
 * UI consumers receive snapshots and issue typed commands; Babylon only presents.
 * Ride orchestration will be connected through this boundary in issue #67.
 * Identity/permit creation requires authored validation in #65; arbitrary
 * caller-provided cover credentials must never grant official eligibility.
 */
export class GameSession {
  readonly #persistence: GameSessionPersistence;
  readonly #restored: boolean;
  readonly #work = new WorkNetwork(productionContent.jobs);
  readonly #listeners = new Set<(state: GameState) => void>();
  #state: GameState;
  #stores: Stores;
  #disposed = false;

  public static open(persistence: GameSessionPersistence): GameSession {
    const restoredState = persistence.load();
    return new GameSession(
      persistence,
      restoredState ?? createInitialGameState(),
      restoredState !== null,
    );
  }

  private constructor(
    persistence: GameSessionPersistence,
    stateInput: GameState,
    restored: boolean,
  ) {
    this.#persistence = persistence;
    this.#state = GameStateV11Schema.parse(stateInput);
    this.#stores = composeStores(this.#state);
    this.#restored = restored;
  }

  public wasRestored(): boolean {
    return this.#restored;
  }

  public exportState(): GameState {
    this.#assertAlive();
    return GameStateV11Schema.parse({
      ...this.#state,
      economyState: this.#stores.economy.exportState(),
      personalSpaceState: this.#stores.spaces.exportState(),
      personalPersistenceState: this.#stores.personal.exportState(),
      socialState: this.#stores.social?.exportState() ?? null,
      translatorState: this.#stores.translator.exportState(),
      radioState: this.#stores.radio.exportState(),
      relationshipState: this.#stores.relationships.exportState(),
    });
  }

  public getProjection(): GameSessionProjection {
    const state = this.exportState();
    return {
      gameTime: state.gameTime,
      credits: state.economyState.credits,
      currentSpaceId: state.personalSpaceState.currentSpaceId,
      activeRidePhase: state.rideSession?.phase ?? null,
      hasCoverIdentity: state.socialState !== null,
      tunedRadioStationId: state.radioState.tunedStationId,
      radioListening: state.radioState.listening,
      ownedTranslatorPackCount: state.translatorState.ownedPackIds.length,
      activeTranslatorPackCount: state.translatorState.activePackIds.length,
    };
  }

  public listAvailableWork() {
    this.#assertAlive();
    return this.#work.listAvailable(
      this.#state.gameTime,
      createWorkEligibilityContext(
        this.#stores.economy,
        this.#stores.social,
        this.#stores.personal,
        this.#stores.relationships,
      ),
    ).map((entry) => ({
      channel: entry.channel,
      // Never expose mutable references into the authoritative job catalog.
      job: JobContractSchema.parse(entry.job),
    }));
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.#assertAlive();
    this.#listeners.add(listener);
    try {
      listener(this.exportState());
    } catch (error: unknown) {
      this.#listeners.delete(listener);
      throw error;
    }

    return () => {
      this.#listeners.delete(listener);
    };
  }

  public execute(command: GameSessionCommand): GameState {
    this.#assertAlive();
    const before = this.exportState();
    let next: GameState;

    try {
      switch (command.type) {
        case 'space.enter':
          this.#stores.spaces.enter(command.spaceId);
          break;
        case 'space.leave':
          this.#stores.spaces.leave();
          break;
        case 'space.set-flag':
          this.#stores.spaces.setFlag(
            command.spaceId,
            command.flagId,
            command.value,
          );
          break;
        case 'time.advance':
          // Until #67 owns route time, do not let a generic fast-forward
          // clock drift away from the current active ride.
          if (
            this.#state.rideSession !== null &&
            this.#state.rideSession.phase !== 'completed'
          ) {
            throw new Error('World time cannot fast-forward during an unfinished ride.');
          }
          this.#state = {
            ...this.#state,
            gameTime: advanceGameTime(this.#state.gameTime, command.minutes),
          };
          break;
        case 'radio.tune':
          this.#stores.radio.tune(command.stationId);
          break;
        case 'radio.listen':
          this.#stores.radio.setListening(command.listening);
          break;
        case 'translator.activate':
          this.#stores.translator.activatePack(command.packId);
          break;
        case 'translator.deactivate':
          this.#stores.translator.deactivatePack(command.packId);
          break;
        case 'preferences.update':
          this.#state = {
            ...this.#state,
            accessibilityPreferences:
              AccessibilityPreferencesStateSchema.parse(
                command.preferences,
              ),
          };
          break;
        default: {
          const unsupported: never = command;
          throw new Error(`Unsupported session command: ${String(unsupported)}`);
        }
      }

      next = this.exportState();
      this.#persistence.save(next);
      this.#state = next;
    } catch (error: unknown) {
      this.#state = before;
      this.#stores = composeStores(before);
      throw error;
    }

    for (const listener of [...this.#listeners]) {
      try {
        // Fresh state per subscriber: presentation code cannot mutate canonical
        // memory or another subscriber's snapshot.
        listener(this.exportState());
      } catch (error: unknown) {
        // The durable command already succeeded. A presentation listener must
        // never make a caller retry a command that has already been committed.
        this.#listeners.delete(listener);
        console.error('Game session listener failed after commit.', error);
      }
    }

    // The persisted snapshot must never escape as a mutable reference into
    // #state, including when an outside caller retains the command result.
    return this.exportState();
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#listeners.clear();
    this.#disposed = true;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('Cannot use a disposed game session.');
    }
  }
}
