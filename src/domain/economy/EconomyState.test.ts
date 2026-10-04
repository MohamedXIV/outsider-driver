import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import {
  EconomyStateStore,
  EconomyStateSchema,
} from './EconomyState';

const officialJob = productionContent.jobs[0];
const undergroundJob = productionContent.jobs[1];

function completedRide(
  job: typeof officialJob | typeof undergroundJob,
  rideId: string,
) {
  return {
    id: rideId,
    jobId: job.id,
    passengerId: job.passengerId,
    pickupLocationId: job.pickupLocationId,
    destinationLocationId: job.destinationLocationId,
    routeId: job.routeId,
    acceptedAt: {
      day: 1,
      minuteOfDay: 20 * 60,
    },
    status: 'completed' as const,
    startedAt: {
      day: 1,
      minuteOfDay: 20 * 60 + 1,
    },
    completedAt: {
      day: 1,
      minuteOfDay: 20 * 60 + 11,
    },
  };
}

describe('EconomyStateStore', () => {
  it('settles fare, operating expenses, and official standing from authored job terms', () => {
    const store = new EconomyStateStore();
    const settlement = store.settleCompletedRide(
      officialJob,
      completedRide(officialJob, 'ride:official-settlement'),
    );

    expect(settlement).toMatchObject({
      durationMinutes: 10,
      grossFareCredits: 80,
      expenseCredits: 16,
      netCredits: 64,
      creditsAfter: 64,
      officialStandingAfter: 2,
      undergroundAccessAfter: 0,
      undergroundRisk: null,
    });
    expect(store.exportState()).toMatchObject({
      credits: 64,
      lifetimeEarnedCredits: 80,
      lifetimeExpenseCredits: 16,
      officialStanding: 2,
      undergroundAccess: 0,
      settledRideIds: ['ride:official-settlement'],
    });
  });

  it('settles underground work with distinct access progression and risk', () => {
    const store = new EconomyStateStore();
    const settlement = store.settleCompletedRide(
      undergroundJob,
      completedRide(
        undergroundJob,
        'ride:underground-settlement',
      ),
    );

    expect(settlement).toMatchObject({
      grossFareCredits: 108,
      expenseCredits: 20,
      netCredits: 88,
      creditsAfter: 88,
      officialStandingAfter: 0,
      undergroundAccessAfter: 3,
      undergroundRisk: {
        jobId: 'job:docks-underground-clinic',
        source: 'underground',
        riskFootprint: 28,
      },
    });
  });

  it('rejects duplicate settlement so retry cannot double-pay a ride', () => {
    const store = new EconomyStateStore();
    const ride = completedRide(
      undergroundJob,
      'ride:no-double-pay',
    );

    store.settleCompletedRide(undergroundJob, ride);

    expect(() =>
      store.settleCompletedRide(undergroundJob, ride),
    ).toThrow(/already economically settled/);
    expect(store.getCredits()).toBe(88);
  });

  it('supports explicit non-ride expenses without allowing overspend', () => {
    const store = new EconomyStateStore({
      schemaVersion: 1,
      credits: 200,
      lifetimeEarnedCredits: 0,
      lifetimeExpenseCredits: 0,
      officialStanding: 0,
      undergroundAccess: 0,
      settledRideIds: [],
    });

    expect(store.spendCredits(120)).toBe(80);
    expect(() => store.spendCredits(81)).toThrow(
      /Insufficient credits/,
    );
    expect(
      EconomyStateSchema.parse(store.exportState()),
    ).toMatchObject({
      credits: 80,
      lifetimeExpenseCredits: 120,
    });
  });
});
