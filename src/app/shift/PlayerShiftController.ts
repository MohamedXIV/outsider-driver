import { productionContent } from '../../content/production/ProductionContent';
import type { PersonalSpaceDefinition } from '../../content/spaces/PersonalSpaceContracts';
import {
  entityId,
  type PersonalSpaceId,
} from '../../domain/ids/EntityId';
import type { GameState } from '../../persistence/save/gameSave';
import type { PersonalSpacePresentationPort } from '../spaces/PersonalSpaceOrchestrator';
import type { GameSession } from '../session/GameSession';

export type ShiftLocation = 'home' | 'garage' | 'taxi';

export interface ShiftNavigationSnapshot {
  readonly location: ShiftLocation;
  readonly gameTime: GameState['gameTime'];
  readonly credits: number;
  readonly inspectionLight: boolean | null;
}

const HOME = entityId('personal-space', 'home');
const GARAGE = entityId('personal-space', 'garage');

function getSpace(spaceId: PersonalSpaceId): PersonalSpaceDefinition {
  const definition = productionContent.personalSpaces.spaces.find(
    (candidate) => candidate.id === spaceId,
  );
  if (definition === undefined) {
    throw new Error(`Unknown authored personal space: ${spaceId}`);
  }
  return definition;
}

function getFlag(
  state: GameState,
  spaceId: PersonalSpaceId,
  flagId: string,
): boolean {
  const definition = getSpace(spaceId);
  const flag = definition.flags.find((item) => item.id === flagId);
  if (flag === undefined) {
    throw new Error(`Unknown authored flag ${flagId} for ${spaceId}`);
  }
  return state.personalSpaceState.flagOverrides.find(
    (override) => override.spaceId === spaceId && override.flagId === flagId,
  )?.value ?? flag.defaultValue;
}

export class PlayerShiftController {
  readonly #session: GameSession;
  readonly #presentation: PersonalSpacePresentationPort;
  readonly #unsubscribe: () => void;
  #lastSpaceId: PersonalSpaceId | null | undefined;
  #lastFlags = '';
  #disposed = false;

  public constructor(
    session: GameSession,
    presentation: PersonalSpacePresentationPort,
  ) {
    this.#session = session;
    this.#presentation = presentation;

    // The first authored shift begins at home. Existing saves resume at
    // their recorded location; don't forcibly teleport returning players.
    if (!session.wasRestored()) {
      session.execute({ type: 'space.enter', spaceId: HOME });
    }

    this.#unsubscribe = session.subscribe((state) => {
      const current = state.personalSpaceState.currentSpaceId;
      const flags = JSON.stringify(
        state.personalSpaceState.flagOverrides.filter(
          (entry) => entry.spaceId === current,
        ),
      );
      if (current !== this.#lastSpaceId) {
        if (current === null) {
          this.#presentation.showTaxi();
        } else {
          this.#presentation.showPersonalSpace(
            getSpace(current),
            (flagId) => getFlag(state, current, flagId),
          );
        }
        this.#lastSpaceId = current;
        this.#lastFlags = flags;
      } else if (current !== null && flags !== this.#lastFlags) {
        this.#presentation.refreshPersonalSpaceFlags(
          (flagId) => getFlag(state, current, flagId),
        );
        this.#lastFlags = flags;
      }
    });
  }

  public getSnapshot(): ShiftNavigationSnapshot {
    this.#assertAlive();
    const state = this.#session.exportState();
    const space = state.personalSpaceState.currentSpaceId;
    return {
      location: space === HOME ? 'home' : space === GARAGE ? 'garage' : 'taxi',
      gameTime: state.gameTime,
      credits: state.economyState.credits,
      inspectionLight:
        space === GARAGE
          ? getFlag(state, GARAGE, 'inspection-light')
          : null,
    };
  }

  public goToGarage(): void {
    this.#assertAlive();
    const location = this.getSnapshot().location;
    if (location === 'garage') return;
    // Home ↔ garage; a returning driver can park the taxi.
    this.#session.execute({ type: 'space.enter', spaceId: GARAGE });
  }

  public goHome(): void {
    this.#assertAlive();
    if (this.getSnapshot().location !== 'garage') {
      throw new Error('Return to the garage before entering your home.');
    }
    this.#session.execute({ type: 'space.enter', spaceId: HOME });
  }

  public enterTaxi(): void {
    this.#assertAlive();
    if (this.getSnapshot().location !== 'garage') {
      throw new Error('The taxi must be accessed from the garage.');
    }
    this.#session.execute({ type: 'space.leave' });
  }

  public setInspectionLight(enabled: boolean): void {
    this.#assertAlive();
    if (this.getSnapshot().location !== 'garage') {
      throw new Error('Garage inspection lights can only be changed in the garage.');
    }
    this.#session.execute({
      type: 'space.set-flag',
      spaceId: GARAGE,
      flagId: 'inspection-light',
      value: enabled,
    });
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#unsubscribe();
    this.#disposed = true;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('PlayerShiftController is disposed.');
    }
  }
}
