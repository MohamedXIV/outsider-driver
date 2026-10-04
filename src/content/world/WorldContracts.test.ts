import { describe, expect, it } from 'vitest';
import { validateWorldContentCatalog } from './WorldContracts';

export const worldFixture = {
  schemaVersion: 1,
  districts: [
    {
      schemaVersion: 1,
      id: 'district:docks',
      data: {
        displayName: 'The Docks',
      },
    },
  ],
  locations: [
    {
      schemaVersion: 1,
      id: 'location:docks-taxi-rank',
      data: {
        displayName: 'Docks Taxi Rank',
        districtId: 'district:docks',
      },
    },
    {
      schemaVersion: 1,
      id: 'location:docks-clinic',
      data: {
        displayName: 'Night Clinic',
        districtId: 'district:docks',
      },
    },
  ],
  routeEvents: [
    {
      schemaVersion: 1,
      id: 'route-event:docks-checkpoint',
      data: {
        hookId: 'checkpoint.customs-light',
        atProgress: 0.65,
      },
    },
  ],
  routeSegments: [
    {
      schemaVersion: 1,
      id: 'route-segment:docks-night-01',
      data: {
        districtId: 'district:docks',
        durationMinutes: 8,
        eventIds: ['route-event:docks-checkpoint'],
      },
    },
  ],
  routes: [
    {
      schemaVersion: 1,
      id: 'route:docks-night',
      data: {
        displayName: 'Docks Night Route',
        originLocationId: 'location:docks-taxi-rank',
        destinationLocationId: 'location:docks-clinic',
        segmentIds: ['route-segment:docks-night-01'],
      },
    },
  ],
} as const;

describe('WorldContentCatalog', () => {
  it('validates and JSON-round-trips the real production contracts', () => {
    const validated = validateWorldContentCatalog(worldFixture);
    const roundTripped = validateWorldContentCatalog(
      JSON.parse(JSON.stringify(validated)) as unknown,
    );

    expect(roundTripped).toEqual(validated);
  });

  it('fails a missing district reference', () => {
    const broken = structuredClone(worldFixture);
    broken.locations[0].data.districtId = 'district:missing';

    expect(() => validateWorldContentCatalog(broken)).toThrow(
      /references missing content/,
    );
  });

  it('fails a missing route segment instead of treating order as identity', () => {
    const broken = structuredClone(worldFixture);
    broken.routes[0].data.segmentIds = ['route-segment:missing'];

    expect(() => validateWorldContentCatalog(broken)).toThrow(
      /references missing content/,
    );
  });
});
