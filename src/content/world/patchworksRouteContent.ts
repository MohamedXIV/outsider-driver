/**
 * Authored Docks → Outer Margin handoff. The driver reaches Patchworks ONLY
 * after a completed prior clinic ride and a separate, valid dispatch from
 * the clinic. The short meshes below are route-camera staging, not a
 * kilometre-accurate open-world street map or an instant teleport.
 */
export const patchworksRouteContent = {
  districts: [{
    schemaVersion: 1,
    id: 'district:outer-margin',
    data: { displayName: 'Outer Margin' },
  }],
  locations: [{
    schemaVersion: 1,
    id: 'location:outer-margin-patchworks',
    data: {
      displayName: 'Patchworks Parts Shop',
      districtId: 'district:outer-margin',
    },
  }],
  routeSegments: [
    {
      schemaVersion: 1,
      id: 'route-segment:docks-outer-arterial',
      data: {
        districtId: 'district:docks',
        durationMinutes: 4,
        eventIds: [],
      },
    },
    {
      schemaVersion: 1,
      id: 'route-segment:outer-margin-patchworks-approach',
      data: {
        districtId: 'district:outer-margin',
        durationMinutes: 7,
        eventIds: [],
      },
    },
  ],
  routes: [{
    schemaVersion: 1,
    id: 'route:clinic-to-patchworks',
    data: {
      displayName: 'Clinic to Patchworks — Outer Margin',
      originLocationId: 'location:docks-clinic',
      destinationLocationId: 'location:outer-margin-patchworks',
      segmentIds: [
        'route-segment:docks-outer-arterial',
        'route-segment:outer-margin-patchworks-approach',
      ],
    },
  }],
  jobs: [{
    id: 'job:clinic-to-patchworks',
    passengerId: 'passenger:underground-clinic-rider',
    pickupLocationId: 'location:docks-clinic',
    destinationLocationId: 'location:outer-margin-patchworks',
    routeId: 'route:clinic-to-patchworks',
    availability: {
      opensAt: { day: 1, minuteOfDay: 18 * 60 },
      closesAt: { day: 2, minuteOfDay: 2 * 60 },
    },
    // This is a follow-up from an actual completed night-clinic trip,
    // not a second eligible first-shift offer at the Docks taxi rank.
    source: {
      kind: 'underground',
      minimumUndergroundAccess: 3,
      riskFootprint: 34,
    },
    relationshipRequirements: {
      minimumCompletedRides: 1,
    },
    fare: {
      baseCredits: 36,
      perMinuteCredits: 3,
      completionBonusCredits: 8,
    },
    expenses: {
      dispatchFeeCredits: 5,
      operatingCreditsPerMinute: 1,
    },
    completionEffects: {
      officialStandingDelta: 0,
      undergroundAccessDelta: 1,
    },
  }],
  motionProfiles: [
    {
      segmentId: 'route-segment:docks-outer-arterial',
      samples: [
        { progress: 0, targetSpeedMps: 5, curvature: 0, surfaceRoughness: 0.12 },
        { progress: 0.5, targetSpeedMps: 10, curvature: 0.18, surfaceRoughness: 0.15 },
        { progress: 1, targetSpeedMps: 8, curvature: -0.12, surfaceRoughness: 0.2 },
      ],
    },
    {
      segmentId: 'route-segment:outer-margin-patchworks-approach',
      samples: [
        { progress: 0, targetSpeedMps: 8, curvature: -0.08, surfaceRoughness: 0.2 },
        { progress: 0.36, targetSpeedMps: 6, curvature: 0.34, surfaceRoughness: 0.36 },
        { progress: 0.73, targetSpeedMps: 4, curvature: -0.23, surfaceRoughness: 0.31 },
        { progress: 1, targetSpeedMps: 0, curvature: 0, surfaceRoughness: 0.08 },
      ],
    },
  ],
  districtVisuals: [{
    districtId: 'district:outer-margin',
    clearColor: [0.024, 0.019, 0.025],
    ambientColor: [0.38, 0.24, 0.17],
    ambientIntensity: 0.66,
    fogColor: [0.10, 0.08, 0.09],
    baseFogDensity: 0.012,
    rainFogDensity: 0.022,
    nightAmbientMultiplier: 0.9,
    dayAmbientMultiplier: 1.04,
    precipitationAmbientMultiplier: 0.8,
  }],
  segmentScenery: [
    {
      segmentId: 'route-segment:docks-outer-arterial',
      travelDistanceMeters: 40,
      modules: [
        {
          id: 'arterial-repaired-parapet',
          kind: 'box',
          position: [-4.5, 0.8, 20],
          size: [0.5, 1.6, 37],
          diffuseColor: [0.12, 0.11, 0.10],
        },
        {
          id: 'arterial-supported-overpass-deck',
          kind: 'box',
          position: [3.8, 4.2, 22],
          size: [3.1, 0.45, 19],
          diffuseColor: [0.19, 0.17, 0.13],
        },
        {
          id: 'arterial-overpass-column',
          kind: 'box',
          position: [3.8, 2, 26],
          size: [0.7, 4, 0.8],
          diffuseColor: [0.16, 0.13, 0.10],
        },
      ],
    },
    {
      segmentId: 'route-segment:outer-margin-patchworks-approach',
      travelDistanceMeters: 54,
      modules: [
        {
          id: 'margin-repaired-row-housing',
          kind: 'box',
          position: [-5.1, 2.4, 18],
          size: [1.3, 4.8, 33],
          diffuseColor: [0.18, 0.16, 0.13],
        },
        {
          id: 'margin-community-light',
          kind: 'box',
          position: [-4.3, 3.1, 21],
          size: [0.3, 0.35, 0.3],
          diffuseColor: [0.58, 0.28, 0.10],
          emissiveColor: [0.45, 0.18, 0.05],
        },
        {
          id: 'patchworks-workshop-brick-facade',
          kind: 'box',
          position: [5.0, 2.7, 62],
          size: [1.6, 5.4, 13],
          diffuseColor: [0.19, 0.13, 0.11],
        },
        {
          id: 'patchworks-repair-shed-awning',
          kind: 'box',
          position: [4.15, 3.15, 63],
          size: [2.5, 0.3, 10],
          diffuseColor: [0.37, 0.20, 0.11],
          emissiveColor: [0.08, 0.035, 0.012],
        },
        {
          id: 'patchworks-illuminated-sign',
          kind: 'box',
          position: [3.98, 3.85, 61],
          size: [0.32, 0.8, 5.3],
          diffuseColor: [0.38, 0.27, 0.12],
          emissiveColor: [0.48, 0.25, 0.065],
        },
        {
          id: 'patchworks-salvage-parts-stand',
          kind: 'box',
          position: [3.82, 0.74, 65],
          size: [1.9, 1.48, 2.5],
          diffuseColor: [0.12, 0.22, 0.22],
        },
        {
          id: 'patchworks-roadside-stop-marker',
          kind: 'box',
          position: [3.45, 1.7, 56],
          size: [0.25, 3.4, 0.25],
          diffuseColor: [0.25, 0.24, 0.18],
        },
        {
          id: 'patchworks-stop-marker-lamp',
          kind: 'box',
          position: [3.45, 3.34, 56],
          size: [0.6, 0.2, 0.6],
          diffuseColor: [0.55, 0.28, 0.11],
          emissiveColor: [0.48, 0.22, 0.065],
        },
      ],
    },
  ],
} as const;
