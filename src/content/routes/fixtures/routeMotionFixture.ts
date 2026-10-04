export function createRouteMotionFixture(): unknown {
  return {
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
  };
}
