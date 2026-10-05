import { entityId } from '../../domain/ids/EntityId';
import type { PersonalPersistenceStateStore } from '../../domain/personal/PersonalPersistenceState';
import type { PersonalSpaceOrchestrator } from '../spaces/PersonalSpaceOrchestrator';

export class PersonalSpacePersistenceProjection {
  readonly #personal: PersonalPersistenceStateStore;
  readonly #spaces: PersonalSpaceOrchestrator;

  public constructor(
    personal: PersonalPersistenceStateStore,
    spaces: PersonalSpaceOrchestrator,
  ) {
    this.#personal = personal;
    this.#spaces = spaces;
  }

  public refresh(): void {
    this.#spaces.setFlag(
      entityId('personal-space', 'garage'),
      'inspection-light',
      this.#personal.needsMaintenance(),
    );
    this.#spaces.setFlag(
      entityId('personal-space', 'home'),
      'message-indicator',
      this.#personal.hasUnreadMessages(),
    );
  }
}
