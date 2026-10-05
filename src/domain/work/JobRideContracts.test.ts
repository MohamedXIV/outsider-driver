import { describe, expect, it } from 'vitest';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import { entityId } from '../ids/EntityId';
import {
  JobContractSchema,
  RideContractSchema,
  evaluateJobEligibility,
  getUndergroundJobRiskSignal,
  validateJobReferences,
  validateRideReferences,
} from './JobRideContracts';

const passengerId = entityId('passenger', 'fixture-rider');
const passengers = new Set([passengerId]);

const jobFixture = {
  id: 'job:docks-night-clinic',
  passengerId: 'passenger:fixture-rider',
  pickupLocationId: 'location:docks-taxi-rank',
  destinationLocationId: 'location:docks-clinic',
  routeId: 'route:docks-night',
  availability: {
    opensAt: {
      day: 18,
      minuteOfDay: 20 * 60,
    },
    closesAt: {
      day: 19,
      minuteOfDay: 2 * 60,
    },
  },
  source: {
    kind: 'official',
    minimumOfficialStanding: 10,
    requiredCoverAttributes: [
      {
        key: 'work-permit',
        value: 'licensed-driver',
      },
    ],
  },
  fare: {
    baseCredits: 40,
    perMinuteCredits: 3,
    completionBonusCredits: 10,
  },
  expenses: {
    dispatchFeeCredits: 4,
    operatingCreditsPerMinute: 1,
  },
  completionEffects: {
    officialStandingDelta: 2,
    undergroundAccessDelta: 0,
  },
} as const;

describe('JobContract', () => {
  it('uses stable world and passenger references and remains serializable', () => {
    const job = validateJobReferences(
      jobFixture,
      createWorldFixture(),
      passengers,
    );
    const roundTripped = JobContractSchema.parse(
      JSON.parse(JSON.stringify(job)) as unknown,
    );

    expect(roundTripped).toEqual(job);
  });

  it('rejects a route whose endpoints do not match the job', () => {
    const broken = {
      ...jobFixture,
      pickupLocationId: 'location:docks-clinic',
      destinationLocationId: 'location:docks-taxi-rank',
    };

    expect(() =>
      validateJobReferences(broken, createWorldFixture(), passengers),
    ).toThrow(/endpoints do not match/);
  });

  it('rejects an unknown passenger reference', () => {
    expect(() =>
      validateJobReferences(jobFixture, createWorldFixture(), new Set()),
    ).toThrow(/Unknown passenger reference/);
  });

  it('gates official work on authored standing and cover requirements', () => {
    expect(
      evaluateJobEligibility(jobFixture, {
        officialStanding: 5,
        undergroundAccess: 100,
        coverIdentityMatches: () => false,
      }),
    ).toEqual({
      eligible: false,
      reasons: ['official-standing', 'cover:work-permit'],
    });

    expect(
      evaluateJobEligibility(jobFixture, {
        officialStanding: 10,
        undergroundAccess: 0,
        coverIdentityMatches: (key, value) =>
          key === 'work-permit' && value === 'licensed-driver',
      }),
    ).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it('can gate a job on relationship history without conflating human attitude with trust', () => {
    const relationshipJob = {
      ...jobFixture,
      id: 'job:relationship-gated',
      relationshipRequirements: {
        minimumCompletedRides: 2,
        minimumTrust: 70,
        maximumHumanAttitude: -20,
      },
    } as const;

    expect(
      evaluateJobEligibility(relationshipJob, {
        officialStanding: 10,
        undergroundAccess: 0,
        coverIdentityMatches: () => true,
        getCompletedRideCount: () => 2,
        getRelationshipMetric: (_passengerId, dimension) =>
          dimension === 'trust' ? 85 : null,
        getHumanAttitude: () => -45,
      }),
    ).toEqual({
      eligible: true,
      reasons: [],
    });

    expect(
      evaluateJobEligibility(relationshipJob, {
        officialStanding: 10,
        undergroundAccess: 0,
        coverIdentityMatches: () => true,
        getCompletedRideCount: () => 2,
        getRelationshipMetric: () => 85,
        getHumanAttitude: () => 20,
      }).reasons,
    ).toContain('relationship:human-attitude-maximum');
  });

  it('fails relationship-gated jobs when no relationship context is supplied', () => {
    const relationshipJob = {
      ...jobFixture,
      id: 'job:relationship-context-required',
      relationshipRequirements: {
        minimumCompletedRides: 0,
        minimumHumanAttitude: -100,
      },
    } as const;

    expect(
      evaluateJobEligibility(relationshipJob, {
        officialStanding: 10,
        undergroundAccess: 0,
        coverIdentityMatches: () => true,
      }),
    ).toEqual({
      eligible: false,
      reasons: [
        'relationship:completed-rides',
        'relationship:human-attitude-minimum',
      ],
    });
  });

  it('makes underground access and risk first-class rather than cosmetic', () => {
    const underground = {
      ...jobFixture,
      id: 'job:docks-underground',
      source: {
        kind: 'underground',
        minimumUndergroundAccess: 20,
        riskFootprint: 35,
      },
      completionEffects: {
        officialStandingDelta: 0,
        undergroundAccessDelta: 4,
      },
    } as const;

    expect(
      evaluateJobEligibility(underground, {
        officialStanding: 100,
        undergroundAccess: 19,
        coverIdentityMatches: () => true,
      }),
    ).toEqual({
      eligible: false,
      reasons: ['underground-access'],
    });
    expect(getUndergroundJobRiskSignal(underground)).toEqual({
      jobId: 'job:docks-underground',
      source: 'underground',
      riskFootprint: 35,
    });
  });
});

describe('RideContract', () => {
  it('tracks active route progress by stable segment ID, not array index', () => {
    const ride = validateRideReferences(
      {
        id: 'ride:docks-night-clinic',
        jobId: jobFixture.id,
        passengerId: jobFixture.passengerId,
        pickupLocationId: jobFixture.pickupLocationId,
        destinationLocationId: jobFixture.destinationLocationId,
        routeId: jobFixture.routeId,
        acceptedAt: { day: 18, minuteOfDay: 20 * 60 + 3 },
        status: 'active',
        startedAt: { day: 18, minuteOfDay: 20 * 60 + 8 },
        currentSegmentId: 'route-segment:docks-night-01',
        segmentProgress: 0.4,
      },
      createWorldFixture(),
      passengers,
    );

    const roundTripped = RideContractSchema.parse(
      JSON.parse(JSON.stringify(ride)) as unknown,
    );

    expect(roundTripped).toEqual(ride);
  });


  it('rejects impossible ride timestamps', () => {
    expect(
      RideContractSchema.safeParse({
        id: 'ride:impossible-time',
        jobId: jobFixture.id,
        passengerId: jobFixture.passengerId,
        pickupLocationId: jobFixture.pickupLocationId,
        destinationLocationId: jobFixture.destinationLocationId,
        routeId: jobFixture.routeId,
        acceptedAt: { day: 18, minuteOfDay: 500 },
        status: 'active',
        startedAt: { day: 18, minuteOfDay: 499 },
        currentSegmentId: 'route-segment:docks-night-01',
        segmentProgress: 0,
      }).success,
    ).toBe(false);
  });

  it('rejects active progress on a segment outside the selected route', () => {
    expect(() =>
      validateRideReferences(
        {
          id: 'ride:docks-night-clinic',
          jobId: jobFixture.id,
          passengerId: jobFixture.passengerId,
          pickupLocationId: jobFixture.pickupLocationId,
          destinationLocationId: jobFixture.destinationLocationId,
          routeId: jobFixture.routeId,
          acceptedAt: { day: 18, minuteOfDay: 20 * 60 + 3 },
          status: 'active',
          startedAt: { day: 18, minuteOfDay: 20 * 60 + 8 },
          currentSegmentId: 'route-segment:not-on-route',
          segmentProgress: 0.4,
        },
        createWorldFixture(),
        passengers,
      ),
    ).toThrow(/does not belong to route/);
  });
});
