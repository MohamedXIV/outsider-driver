import type {
  ClaimId,
  FactId,
  PassengerId,
} from '../../domain/ids/EntityId';
import {
  SocialStealthStateStore,
  type ClaimProposal,
} from '../../domain/social/SocialStealthState';
import type {
  NarrativeDomainEvent,
  NarrativeEventSink,
  NarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';

export class SocialStealthNarrativeAdapter
  implements NarrativeQueryPort, NarrativeEventSink
{
  readonly #store: SocialStealthStateStore;

  public constructor(store: SocialStealthStateStore) {
    this.#store = store;
  }

  public hasFact(factId: FactId): boolean {
    return this.#store.hasFact(factId);
  }

  public hasClaim(claimId: ClaimId): boolean {
    return this.#store.hasClaim(claimId);
  }

  public coverIdentityMatches(key: string, value: string): boolean {
    return this.#store.coverIdentityMatches(key, value);
  }

  public wouldContradictClaim(proposal: ClaimProposal): boolean {
    return this.#store.wouldContradict(proposal);
  }

  public getPassengerSuspicion(passengerId: PassengerId): number {
    return this.#store.getPassengerSuspicion(passengerId);
  }

  public getCityAttention(): number {
    return this.#store.getCityAttention();
  }

  public emit(event: NarrativeDomainEvent): void {
    switch (event.type) {
      case 'knowledge.reveal':
        this.#store.learnFact(event.factId);
        return;
      case 'claim.record':
        this.#store.recordClaim(event.claim);
        return;
      case 'suspicion.adjust':
        this.#store.adjustPassengerSuspicion(
          event.passengerId,
          event.delta,
          event.reason,
        );
        return;
      case 'city-attention.adjust':
        this.#store.adjustCityAttention(event.delta, event.reason);
        return;
    }
  }
}
