import source from '../narrative/foundation-passenger.ink?raw';
import { defaultTaxiSceneDefinition } from '../presentation/defaultTaxiScene';

export const productionContent = {
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
  },
  passengers: {
    schemaVersion: 1,
    passengers: [],
  },
  jobs: [],
  routeMotion: {
    schemaVersion: 1,
    profiles: [
      {
        segmentId: 'route-segment:docks-night-01',
        samples: [
          {
            progress: 0,
            targetSpeedMps: 4,
            curvature: 0,
            surfaceRoughness: 0.08,
          },
          {
            progress: 0.35,
            targetSpeedMps: 11,
            curvature: 0.12,
            surfaceRoughness: 0.12,
          },
          {
            progress: 0.7,
            targetSpeedMps: 7,
            curvature: -0.58,
            surfaceRoughness: 0.42,
          },
          {
            progress: 1,
            targetSpeedMps: 9,
            curvature: 0,
            surfaceRoughness: 0.16,
          },
        ],
      },
    ],
  },
  routeExperience: {
    schemaVersion: 1,
    events: [
      {
        eventId: 'route-event:docks-checkpoint',
        behavior: {
          type: 'checkpoint',
          checkpointId: 'customs-light',
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
        segmentId: 'route-segment:docks-night-01',
        travelDistanceMeters: 36,
        modules: [
          {
            id: 'dock-wall-left',
            kind: 'box',
            position: [-4.4, 1.3, 18],
            size: [0.5, 3.5, 38],
            diffuseColor: [0.055, 0.065, 0.075],
          },
          {
            id: 'dock-wall-right',
            kind: 'box',
            position: [4.4, 1.1, 18],
            size: [0.5, 3, 38],
            diffuseColor: [0.07, 0.055, 0.05],
            emissiveColor: [0.02, 0.008, 0.005],
          },
          {
            id: 'dock-overhead-marker',
            kind: 'box',
            position: [0, 3.2, 12],
            size: [7.5, 0.25, 0.4],
            diffuseColor: [0.12, 0.1, 0.08],
            emissiveColor: [0.22, 0.08, 0.025],
          },
        ],
      },
    ],
  },
  narrativeStories: [
    {
      id: 'foundation-passenger',
      source,
    },
  ],
  taxiScene: defaultTaxiSceneDefinition,
} as const;

export type ProductionContentInput = typeof productionContent;
