import { describe, expect, it } from 'vitest';
import { entityId } from '../ids/EntityId';
import {
  JobContractSchema,
  RideContractSchema,
  validateJobReferences,
  validateRideReferences,
} from './JobRideContracts';
import { worldFixture } from '../../content/world/WorldContracts.test';

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
} as const;

describe('JobContract', () => {
  it('uses stable world and passenger references and remains serializable', () => {
    const job = validateJobReferences(jobFixture, worldFixture, passengers);
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
      validateJobReferences(broken, worldFixture, passengers),
    ).toThrow(/endpoints do not match/);
  });

  it('rejects an unknown passenger reference', () => {
    expect(() =>
      validateJobReferences(jobFixture, worldFixture, new Set()),
    ).toThrow(/Unknown passenger reference/);
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
      worldFixture,
      passengers,
    );

    const roundTripped = RideContractSchema.parse(
      JSON.parse(JSON.stringify(ride)) as unknown,
    );

    expect(roundTripped).toEqual(ride);
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
        worldFixture,
        passengers,
      ),
    ).toThrow(/does not belong to route/);
  });
});
