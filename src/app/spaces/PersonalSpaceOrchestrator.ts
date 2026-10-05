import type {
  PersonalSpaceDefinition,
} from '../../content/spaces/PersonalSpaceContracts';
import type { PersonalSpaceId } from '../../domain/ids/EntityId';
import type { PersonalSpaceStateStore } from '../../domain/spaces/PersonalSpaceState';

export type PersonalSpaceFlagResolver = (flagId: string) => boolean;

export interface PersonalSpacePresentationPort {
  showPersonalSpace(
    definition: PersonalSpaceDefinition,
    resolveFlag: PersonalSpaceFlagResolver,
  ): void;
  refreshPersonalSpaceFlags(
    resolveFlag: PersonalSpaceFlagResolver,
  ): void;
  showTaxi(): void;
}

export class PersonalSpaceOrchestrator {
  readonly #state: PersonalSpaceStateStore;
  readonly #presentation: PersonalSpacePresentationPort;

  public constructor(
    state: PersonalSpaceStateStore,
    presentation: PersonalSpacePresentationPort,
  ) {
    this.#state = state;
    this.#presentation = presentation;
  }

  public enter(spaceId: PersonalSpaceId): PersonalSpaceDefinition {
    const definition = this.#state.enter(spaceId);

    this.#presentation.showPersonalSpace(
      definition,
      (flagId) => this.#state.getFlag(spaceId, flagId),
    );

    return definition;
  }

  public setFlag(
    spaceId: PersonalSpaceId,
    flagId: string,
    value: boolean,
  ): void {
    this.#state.setFlag(spaceId, flagId, value);

    if (this.#state.getCurrentSpaceId() === spaceId) {
      this.#presentation.refreshPersonalSpaceFlags(
        (candidateFlagId) =>
          this.#state.getFlag(spaceId, candidateFlagId),
      );
    }
  }

  public leaveForTaxi(): void {
    this.#state.leave();
    this.#presentation.showTaxi();
  }
}
