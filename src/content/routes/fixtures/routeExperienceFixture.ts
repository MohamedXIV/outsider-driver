export function createRouteExperienceFixture(): unknown {
  return {
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
  };
}
