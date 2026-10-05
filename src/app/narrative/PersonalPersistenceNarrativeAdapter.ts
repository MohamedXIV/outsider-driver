import type {
  PersonalPersistenceNarrativeQueryPort,
  NarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';
import type { PersonalPersistenceStateStore } from '../../domain/personal/PersonalPersistenceState';
import {
  entityIdSchema,
} from '../../domain/ids/EntityId';

export class PersonalPersistenceNarrativeAdapter
  implements PersonalPersistenceNarrativeQueryPort
{
  readonly #store: PersonalPersistenceStateStore;

  public constructor(store: PersonalPersistenceStateStore) {
    this.#store = store;
  }

  public hasTaxiCapability(capability: string): boolean {
    return this.#store.hasTaxiCapability(capability);
  }

  public hasItem(itemId: string): boolean {
    return this.#store.hasItem(
      entityIdSchema('item').parse(itemId),
    );
  }

  public getTaxiCondition(): number {
    return this.#store.getTaxiCondition();
  }

  public hasUnreadMessage(messageId: string): boolean {
    return this.#store.hasUnreadMessage(
      entityIdSchema('message').parse(messageId),
    );
  }
}

export function withPersonalPersistenceNarrativeQueries(
  base: NarrativeQueryPort,
  personal: PersonalPersistenceNarrativeQueryPort,
): NarrativeQueryPort {
  return {
    ...base,
    personal,
  };
}
