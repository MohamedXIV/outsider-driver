export interface BranchingRouteFlowFixture {
  readonly world: unknown;
  readonly motion: unknown;
  readonly experience: unknown;
}

export function createBranchingRouteFlowFixture(): BranchingRouteFlowFixture {
  return {
    world: {
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
          id: 'route-event:docks-diversion',
          data: {
            hookId: 'decision.docks-diversion',
            atProgress: 0.5,
          },
        },
      ],
      routeSegments: [
        {
          schemaVersion: 1,
          id: 'route-segment:docks-main',
          data: {
            districtId: 'district:docks',
            durationMinutes: 8,
            eventIds: ['route-event:docks-diversion'],
          },
        },
        {
          schemaVersion: 1,
          id: 'route-segment:docks-diversion',
          data: {
            districtId: 'district:docks',
            durationMinutes: 4,
            eventIds: [],
          },
        },
      ],
      routes: [
        {
          schemaVersion: 1,
          id: 'route:docks-main',
          data: {
            displayName: 'Docks Main Route',
            originLocationId: 'location:docks-taxi-rank',
            destinationLocationId: 'location:docks-clinic',
            segmentIds: ['route-segment:docks-main'],
          },
        },
        {
          schemaVersion: 1,
          id: 'route:docks-diversion',
          data: {
            displayName: 'Docks Service Diversion',
            originLocationId: 'location:docks-taxi-rank',
            destinationLocationId: 'location:docks-clinic',
            segmentIds: ['route-segment:docks-diversion'],
          },
        },
      ],
    },
    motion: {
      schemaVersion: 1,
      profiles: [
        {
          segmentId: 'route-segment:docks-main',
          samples: [
            {
              progress: 0,
              targetSpeedMps: 5,
              curvature: 0,
              surfaceRoughness: 0.1,
            },
            {
              progress: 1,
              targetSpeedMps: 8,
              curvature: 0.1,
              surfaceRoughness: 0.15,
            },
          ],
        },
        {
          segmentId: 'route-segment:docks-diversion',
          samples: [
            {
              progress: 0,
              targetSpeedMps: 4,
              curvature: -0.2,
              surfaceRoughness: 0.3,
            },
            {
              progress: 1,
              targetSpeedMps: 6,
              curvature: 0,
              surfaceRoughness: 0.2,
            },
          ],
        },
      ],
    },
    experience: {
      schemaVersion: 1,
      events: [
        {
          eventId: 'route-event:docks-diversion',
          behavior: {
            type: 'decision',
            promptKey: 'route.docks.diversion',
            choices: [
              {
                id: 'stay-main',
                labelKey: 'route.choice.stay-main',
                command: {
                  type: 'continue',
                },
              },
              {
                id: 'take-service-road',
                labelKey: 'route.choice.take-service-road',
                command: {
                  type: 'divert',
                  routeId: 'route:docks-diversion',
                },
              },
            ],
          },
        },
      ],
      districtVisuals: [
        {
          districtId: 'district:docks',
          clearColor: [0.012, 0.018, 0.03],
          ambientColor: [0.25, 0.34, 0.46],
          ambientIntensity: 0.62,
          fogColor: [0.06, 0.08, 0.11],
          baseFogDensity: 0.006,
          rainFogDensity: 0.016,
          nightAmbientMultiplier: 0.82,
          dayAmbientMultiplier: 1.1,
          precipitationAmbientMultiplier: 0.72,
        },
      ],
      segmentScenery: [
        {
          segmentId: 'route-segment:docks-main',
          travelDistanceMeters: 36,
          modules: [],
        },
        {
          segmentId: 'route-segment:docks-diversion',
          travelDistanceMeters: 24,
          modules: [],
        },
      ],
    },
  };
}
