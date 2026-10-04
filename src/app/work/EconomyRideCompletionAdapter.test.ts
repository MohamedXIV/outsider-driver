import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { PassengerDocumentSchema } from '../../content/passengers/PassengerContracts';
import { EconomyStateStore } from '../../domain/economy/EconomyState';
import { EconomyRideCompletionAdapter } from './EconomyRideCompletionAdapter';
import { WorkNetwork } from './WorkNetwork';

describe('EconomyRideCompletionAdapter', () => {
  it('commits ride resolution into persistent economy state', () => {
    const economy = new EconomyStateStore();
    const network = new WorkNetwork(productionContent.jobs);
    const settlements: number[] = [];
    const adapter = new EconomyRideCompletionAdapter(
      economy,
      network,
      (settlement) => {
        settlements.push(settlement.netCredits);
      },
    );
    const passenger = PassengerDocumentSchema.parse(
      productionContent.passengers.passengers[1],
    );

    adapter.commit({
      ride: {
        id: 'ride:adapter-underground',
        jobId: 'job:docks-underground-clinic',
        passengerId: 'passenger:underground-clinic-rider',
        pickupLocationId: 'location:docks-taxi-rank',
        destinationLocationId: 'location:docks-clinic',
        routeId: 'route:docks-night',
        acceptedAt: {
          day: 1,
          minuteOfDay: 20 * 60,
        },
        status: 'completed',
        startedAt: {
          day: 1,
          minuteOfDay: 20 * 60 + 1,
        },
        completedAt: {
          day: 1,
          minuteOfDay: 20 * 60 + 11,
        },
      },
      passenger,
      emittedRouteEventIds: ['route-event:docks-checkpoint'],
      narrativeEnded: true,
    });

    expect(economy.getCredits()).toBe(88);
    expect(economy.getUndergroundAccess()).toBe(3);
    expect(settlements).toEqual([88]);
  });
});
