export interface WorldFixtureOptions {
  readonly locationDistrictId?: string;
  readonly routeSegmentId?: string;
}

export function createWorldFixture(
  options: WorldFixtureOptions = {},
): unknown {
  return {
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
          districtId: options.locationDistrictId ?? 'district:docks',
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
          segmentIds: [
            options.routeSegmentId ?? 'route-segment:docks-night-01',
          ],
        },
      },
    ],
  };
}
