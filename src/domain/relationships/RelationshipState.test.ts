import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { entityId } from '../ids/EntityId';
import {
  RelationshipStateStore,
  createInitialRelationshipState,
} from './RelationshipState';

describe('RelationshipStateStore', () => {
  it('keeps relationship closeness separate from attitude toward humans', () => {
    const store = new RelationshipStateStore(
      productionContent.relationships,
    );
    const passengerId = entityId(
      'passenger',
      'underground-clinic-rider',
    );

    store.adjustMetric(
      passengerId,
      'trust',
      70,
      'ride.kept-confidence',
    );

    expect(store.getMetric(passengerId, 'trust')).toBe(85);
    expect(store.getHumanAttitude(passengerId)).toBe(-45);

    store.adjustHumanAttitude(
      passengerId,
      10,
      'human.reconsidered',
    );

    expect(store.getMetric(passengerId, 'trust')).toBe(85);
    expect(store.getHumanAttitude(passengerId)).toBe(-35);
  });

  it('does not force affection onto passengers that do not author it', () => {
    const store = new RelationshipStateStore(
      productionContent.relationships,
    );
    const passengerId = entityId(
      'passenger',
      'official-clinic-rider',
    );

    expect(store.hasDimension(passengerId, 'trust')).toBe(true);
    expect(store.hasDimension(passengerId, 'affection')).toBe(false);
    expect(() => {
      store.getMetric(passengerId, 'affection');
    }).toThrow(/not enabled/);
  });

  it('records completed rides idempotently and preserves long-running counts', () => {
    const store = new RelationshipStateStore(
      productionContent.relationships,
      createInitialRelationshipState(),
    );
    const passengerId = entityId(
      'passenger',
      'underground-clinic-rider',
    );
    const rideId = entityId('ride', 'relationship-first');

    store.recordCompletedRide(
      rideId,
      passengerId,
      {
        day: 3,
        minuteOfDay: 20 * 60,
      },
    );
    store.recordCompletedRide(
      rideId,
      passengerId,
      {
        day: 3,
        minuteOfDay: 20 * 60,
      },
    );

    expect(store.getCompletedRideCount(passengerId)).toBe(1);
    expect(store.getLastCompletedAt(passengerId)).toEqual({
      day: 3,
      minuteOfDay: 20 * 60,
    });

    expect(() => {
      store.recordCompletedRide(
        entityId('ride', 'relationship-older'),
        passengerId,
        {
          day: 2,
          minuteOfDay: 20 * 60,
        },
      );
    }).toThrow(/cannot move backward/);
  });
});
