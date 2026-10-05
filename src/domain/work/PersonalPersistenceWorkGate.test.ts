import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import {
  evaluateJobEligibility,
} from './JobRideContracts';

describe('personal persistence work gates', () => {
  it('can require taxi condition, upgrade capability, and an owned item', () => {
    const baseJob = productionContent.jobs[1];
    const gatedJob = {
      ...baseJob,
      personalRequirements: {
        minimumTaxiCondition: 70,
        requiredTaxiCapabilities: ['cabin.protection'],
        requiredItemIds: ['item:docks-clinic-token'],
      },
    };

    expect(
      evaluateJobEligibility(gatedJob, {
        officialStanding: 0,
        undergroundAccess: 100,
        taxiCondition: 65,
        coverIdentityMatches: () => false,
        hasTaxiCapability: () => false,
        hasItem: () => false,
      }),
    ).toEqual({
      eligible: false,
      reasons: [
        'taxi-condition',
        'taxi-capability:cabin.protection',
        'item:item:docks-clinic-token',
      ],
    });

    expect(
      evaluateJobEligibility(gatedJob, {
        officialStanding: 0,
        undergroundAccess: 100,
        taxiCondition: 90,
        coverIdentityMatches: () => false,
        hasTaxiCapability: (capability) =>
          capability === 'cabin.protection',
        hasItem: (itemId) =>
          itemId === 'item:docks-clinic-token',
      }),
    ).toEqual({
      eligible: true,
      reasons: [],
    });
  });
});
