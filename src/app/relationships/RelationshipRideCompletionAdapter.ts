import type {
  RideCompletionCommitPort,
  RideCompletionContext,
} from '../rides/PassengerRideOrchestrator';
import type {
  RelationshipStateStore,
} from '../../domain/relationships/RelationshipState';

export class RelationshipRideCompletionAdapter
  implements RideCompletionCommitPort
{
  readonly #relationships: RelationshipStateStore;

  public constructor(relationships: RelationshipStateStore) {
    this.#relationships = relationships;
  }

  public commit(context: RideCompletionContext): void {
    this.#relationships.recordCompletedRide(
      context.ride.id,
      context.passenger.id,
      context.ride.completedAt,
    );
  }
}
