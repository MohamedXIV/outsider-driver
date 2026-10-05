import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { PassengerDocumentSchema } from '../../content/passengers/PassengerContracts';
import { entityId } from '../../domain/ids/EntityId';
import { RelationshipStateStore } from '../../domain/relationships/RelationshipState';
import { RelationshipRideCompletionAdapter } from './RelationshipRideCompletionAdapter';

describe('RelationshipRideCompletionAdapter', () => {
  it('records completed ride history through the existing ride completion port', () => {
    const relationships = new RelationshipStateStore(
      productionContent.relationships,
    );
    const adapter = new RelationshipRideCompletionAdapter(
      relationships,
    );
    const passenger = PassengerDocumentSchema.parse(
      productionContent.passengers.passengers[1],
    );

    adapter.commit({
      ride: {
        id: entityId('ride', 'relationship-completion'),
        jobId: entityId('job', 'docks-underground-clinic'),
        passengerId: passenger.id,
        pickupLocationId: entityId(
          'location',
          'docks-taxi-rank',
        ),
        destinationLocationId: entityId(
          'location',
          'docks-clinic',
        ),
        routeId: entityId('route', 'docks-night'),
        acceptedAt: {
          day: 7,
          minuteOfDay: 20 * 60,
        },
        status: 'completed',
        startedAt: {
          day: 7,
          minuteOfDay: 20 * 60 + 1,
        },
        completedAt: {
          day: 7,
          minuteOfDay: 20 * 60 + 11,
        },
      },
      passenger,
      emittedRouteEventIds: [],
      narrativeEnded: true,
    });

    expect(
      relationships.getCompletedRideCount(passenger.id),
    ).toBe(1);
    expect(
      relationships.getLastCompletedAt(passenger.id),
    ).toEqual({
      day: 7,
      minuteOfDay: 20 * 60 + 11,
    });
  });
});
