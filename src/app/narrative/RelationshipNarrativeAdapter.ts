import type {
  NarrativeDomainEvent,
  NarrativeEventSink,
  NarrativeQueryPort,
  RelationshipNarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';
import type {
  PassengerId,
} from '../../domain/ids/EntityId';
import type {
  RelationshipDimension,
} from '../../content/relationships/RelationshipContracts';
import type {
  RelationshipStateStore,
} from '../../domain/relationships/RelationshipState';

export class RelationshipNarrativeAdapter
  implements RelationshipNarrativeQueryPort, NarrativeEventSink
{
  readonly #store: RelationshipStateStore;

  public constructor(store: RelationshipStateStore) {
    this.#store = store;
  }

  public getRelationshipMetric(
    passengerId: PassengerId,
    dimension: RelationshipDimension,
  ): number {
    return this.#store.getMetric(passengerId, dimension);
  }

  public getHumanAttitude(passengerId: PassengerId): number {
    return this.#store.getHumanAttitude(passengerId);
  }

  public getCompletedRideCount(passengerId: PassengerId): number {
    return this.#store.getCompletedRideCount(passengerId);
  }

  public emit(event: NarrativeDomainEvent): void {
    switch (event.type) {
      case 'relationship.adjust':
        this.#store.adjustMetric(
          event.passengerId,
          event.dimension,
          event.delta,
          event.reason,
        );
        return;
      case 'human-attitude.adjust':
        this.#store.adjustHumanAttitude(
          event.passengerId,
          event.delta,
          event.reason,
        );
        return;
      case 'knowledge.reveal':
      case 'claim.record':
      case 'suspicion.adjust':
      case 'city-attention.adjust':
        throw new Error(
          `RelationshipNarrativeAdapter cannot handle ${event.type}; compose it with the owning narrative sink.`,
        );
    }
  }
}

export function withRelationshipNarrativeQueries(
  base: NarrativeQueryPort,
  relationships: RelationshipNarrativeQueryPort,
): NarrativeQueryPort {
  return {
    ...base,
    relationships,
    // Class methods live on the prototype and disappear in `...base`.
    // Forward via the owning instance so social/knowledge Ink queries keep
    // their authoritative state and correct `this` binding.
    hasFact: (factId) => base.hasFact(factId),
    hasClaim: (claimId) => base.hasClaim(claimId),
    coverIdentityMatches: (key, value) =>
      base.coverIdentityMatches(key, value),
    wouldContradictClaim: (proposal) =>
      base.wouldContradictClaim(proposal),
    getPassengerSuspicion: (passengerId) =>
      base.getPassengerSuspicion(passengerId),
    getCityAttention: () => base.getCityAttention(),
  };
}

export function withRelationshipNarrativeEvents(
  base: NarrativeEventSink,
  relationships: NarrativeEventSink,
): NarrativeEventSink {
  return {
    emit: (event) => {
      switch (event.type) {
        case 'relationship.adjust':
        case 'human-attitude.adjust':
          relationships.emit(event);
          return;
        case 'knowledge.reveal':
        case 'claim.record':
        case 'suspicion.adjust':
        case 'city-attention.adjust':
          base.emit(event);
          return;
      }
    },
  };
}
