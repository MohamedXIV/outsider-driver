import source from '../narrative/foundation-passenger.ink?raw';
import { defaultTaxiSceneDefinition } from '../presentation/defaultTaxiScene';
import { defaultPersonalSpaceCatalog } from '../spaces/defaultPersonalSpaces';

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
    passengers: [
      {
        schemaVersion: 1,
        id: 'passenger:official-clinic-rider',
        data: {
          displayName: 'Clinic Dispatcher',
          lifecycleKind: 'routine',
          narrativeStoryId: 'foundation-passenger',
        },
      },
      {
        schemaVersion: 1,
        id: 'passenger:underground-clinic-rider',
        data: {
          displayName: 'Backchannel Rider',
          lifecycleKind: 'recurring',
          narrativeStoryId: 'foundation-passenger',
        },
      },
    ],
  },
  relationships: {
    schemaVersion: 1,
    profiles: [
      {
        passengerId: 'passenger:official-clinic-rider',
        trust: {
          initialValue: 0,
        },
        initialHumanAttitude: -10,
      },
      {
        passengerId: 'passenger:underground-clinic-rider',
        trust: {
          initialValue: 15,
        },
        affection: {
          initialValue: 0,
        },
        initialHumanAttitude: -45,
        recurrence: {
          minimumCompletedRides: 1,
          cooldownMinutes: 12 * 60,
          dailyWindow: {
            startMinuteOfDay: 18 * 60,
            endMinuteOfDay: 23 * 60,
          },
          requiredFactIds: [
            'fact:underground-clinic-window',
          ],
          forbiddenFactIds: [],
          minimumTrust: 10,
          minimumAffection: 0,
        },
      },
    ],
  },
  passengerPerformance: {
    schemaVersion: 1,
    profiles: [
      {
        passengerId: 'passenger:official-clinic-rider',
        channels: {
          talk: [
            {
              parameterName: 'Mouth',
              components: [{ source: 'value', invert: false }],
            },
          ],
          blink: [
            {
              parameterName: 'Blink',
              components: [{ source: 'value', invert: false }],
            },
          ],
          gaze: [
            {
              parameterName: 'Gaze',
              components: [
                { source: 'x', invert: false },
                { source: 'y', invert: false },
              ],
            },
          ],
          head: [
            {
              parameterName: 'Head',
              components: [
                { source: 'x', invert: false },
                { source: 'y', invert: false },
              ],
            },
          ],
          body: [
            {
              parameterName: 'Body',
              components: [
                { source: 'x', invert: false },
                { source: 'y', invert: false },
              ],
            },
          ],
        },
        expressions: [
          {
            name: 'guarded',
            assignments: [
              {
                parameterName: 'Mood',
                normalizedValues: [-0.4],
              },
            ],
          },
          {
            name: 'firm',
            assignments: [
              {
                parameterName: 'Mood',
                normalizedValues: [0.5],
              },
            ],
          },
        ],
        cues: [
          {
            name: 'neutral',
            expression: null,
            operations: [
              { channel: 'talk', values: [0] },
              { channel: 'blink', values: [0] },
              { channel: 'gaze', values: [0, 0] },
              { channel: 'head', values: [0, 0] },
              { channel: 'body', values: [0, 0] },
            ],
          },
          {
            name: 'guarded',
            expression: 'guarded',
            operations: [
              { channel: 'talk', values: [0.2] },
              { channel: 'gaze', values: [-0.25, 0.05] },
              { channel: 'head', values: [-0.12, 0.04] },
              { channel: 'body', values: [-0.08, 0] },
            ],
          },
          {
            name: 'speaking',
            expression: null,
            operations: [
              { channel: 'talk', values: [0.7] },
              { channel: 'gaze', values: [0, 0] },
            ],
          },
          {
            name: 'firm',
            expression: 'firm',
            operations: [
              { channel: 'talk', values: [0.35] },
              { channel: 'gaze', values: [0.1, 0] },
              { channel: 'head', values: [0.08, 0.02] },
              { channel: 'body', values: [0.05, 0] },
            ],
          },
        ],
      },
      {
        passengerId: 'passenger:underground-clinic-rider',
        channels: {
          talk: [
            {
              parameterName: 'Mouth',
              components: [{ source: 'value', invert: false }],
            },
          ],
          blink: [
            {
              parameterName: 'Blink',
              components: [{ source: 'value', invert: false }],
            },
          ],
          gaze: [
            {
              parameterName: 'Gaze',
              components: [
                { source: 'x', invert: false },
                { source: 'y', invert: false },
              ],
            },
          ],
          head: [
            {
              parameterName: 'Head',
              components: [
                { source: 'x', invert: false },
                { source: 'y', invert: false },
              ],
            },
          ],
          body: [
            {
              parameterName: 'Body',
              components: [
                { source: 'x', invert: false },
                { source: 'y', invert: false },
              ],
            },
          ],
        },
        expressions: [
          {
            name: 'guarded',
            assignments: [
              {
                parameterName: 'Mood',
                normalizedValues: [-0.4],
              },
            ],
          },
          {
            name: 'firm',
            assignments: [
              {
                parameterName: 'Mood',
                normalizedValues: [0.5],
              },
            ],
          },
        ],
        cues: [
          {
            name: 'neutral',
            expression: null,
            operations: [
              { channel: 'talk', values: [0] },
              { channel: 'blink', values: [0] },
              { channel: 'gaze', values: [0, 0] },
              { channel: 'head', values: [0, 0] },
              { channel: 'body', values: [0, 0] },
            ],
          },
          {
            name: 'guarded',
            expression: 'guarded',
            operations: [
              { channel: 'talk', values: [0.2] },
              { channel: 'gaze', values: [-0.25, 0.05] },
              { channel: 'head', values: [-0.12, 0.04] },
              { channel: 'body', values: [-0.08, 0] },
            ],
          },
          {
            name: 'speaking',
            expression: null,
            operations: [
              { channel: 'talk', values: [0.7] },
              { channel: 'gaze', values: [0, 0] },
            ],
          },
          {
            name: 'firm',
            expression: 'firm',
            operations: [
              { channel: 'talk', values: [0.35] },
              { channel: 'gaze', values: [0.1, 0] },
              { channel: 'head', values: [0.08, 0.02] },
              { channel: 'body', values: [0.05, 0] },
            ],
          },
        ],
      },
    ],
  },
  jobs: [
    {
      id: 'job:docks-official-clinic',
      passengerId: 'passenger:official-clinic-rider',
      pickupLocationId: 'location:docks-taxi-rank',
      destinationLocationId: 'location:docks-clinic',
      routeId: 'route:docks-night',
      availability: {
        opensAt: {
          day: 1,
          minuteOfDay: 18 * 60,
        },
        closesAt: {
          day: 2,
          minuteOfDay: 2 * 60,
        },
      },
      source: {
        kind: 'official',
        minimumOfficialStanding: 0,
        requiredCoverAttributes: [
          {
            key: 'work-permit',
            value: 'licensed-driver',
          },
        ],
      },
      fare: {
        baseCredits: 42,
        perMinuteCredits: 3,
        completionBonusCredits: 8,
      },
      expenses: {
        dispatchFeeCredits: 6,
        operatingCreditsPerMinute: 1,
      },
      completionEffects: {
        officialStandingDelta: 2,
        undergroundAccessDelta: 0,
      },
    },
    {
      id: 'job:docks-underground-clinic',
      passengerId: 'passenger:underground-clinic-rider',
      pickupLocationId: 'location:docks-taxi-rank',
      destinationLocationId: 'location:docks-clinic',
      routeId: 'route:docks-night',
      availability: {
        opensAt: {
          day: 1,
          minuteOfDay: 18 * 60,
        },
        closesAt: {
          day: 2,
          minuteOfDay: 2 * 60,
        },
      },
      source: {
        kind: 'underground',
        minimumUndergroundAccess: 0,
        riskFootprint: 28,
      },
      fare: {
        baseCredits: 56,
        perMinuteCredits: 4,
        completionBonusCredits: 12,
      },
      expenses: {
        dispatchFeeCredits: 10,
        operatingCreditsPerMinute: 1,
      },
      completionEffects: {
        officialStandingDelta: 0,
        undergroundAccessDelta: 3,
      },
    },
  ],
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
  translator: {
    schemaVersion: 1,
    languages: [
      {
        schemaVersion: 1,
        id: 'language:dock-common',
        data: {
          displayName: 'Dock Common',
          baseLanguageId: null,
        },
      },
    ],
    packs: [
      {
        schemaVersion: 1,
        id: 'translator-pack:civic-basic-v1',
        data: {
          displayName: 'Civic Basic v1',
          version: 1,
          legality: 'licensed',
          costCredits: 120,
          riskFootprint: 2,
          compatibility: {
            minRuntimeApiVersion: 1,
            maxRuntimeApiVersion: 1,
          },
          capabilities: [
            {
              languageId: 'language:dock-common',
              register: 'general',
              vocabularyKey: null,
              coverage: 0.98,
              quality: 0.96,
              uncertainty: 0.03,
            },
          ],
        },
      },
      {
        schemaVersion: 1,
        id: 'translator-pack:docks-slang-v1',
        data: {
          displayName: 'Docks Street Lexicon v1',
          version: 1,
          legality: 'illegal',
          costCredits: 180,
          riskFootprint: 35,
          compatibility: {
            minRuntimeApiVersion: 1,
            maxRuntimeApiVersion: 1,
          },
          capabilities: [
            {
              languageId: 'language:dock-common',
              register: 'slang',
              vocabularyKey: 'dock-street',
              coverage: 0.86,
              quality: 0.78,
              uncertainty: 0.15,
            },
          ],
        },
      },
    ],
  },
  radio: {
    schemaVersion: 1,
    stations: [
      {
        schemaVersion: 1,
        id: 'radio-station:civic-one',
        data: {
          displayName: 'Civic One',
          frequencyLabel: '88.4 CIV',
          defaultLanguageId: 'language:dock-common',
          discoverability: 'public',
        },
      },
      {
        schemaVersion: 1,
        id: 'radio-station:dockwave',
        data: {
          displayName: 'Dockwave',
          frequencyLabel: '94.7 DWV',
          defaultLanguageId: 'language:dock-common',
          discoverability: 'public',
        },
      },
      {
        schemaVersion: 1,
        id: 'radio-station:underchannel',
        data: {
          displayName: 'Underchannel',
          frequencyLabel: '???.? U/C',
          defaultLanguageId: 'language:dock-common',
          discoverability: 'hidden',
        },
      },
    ],
    broadcasts: [
      {
        schemaVersion: 1,
        id: 'broadcast:civic-evening-traffic',
        data: {
          stationId: 'radio-station:civic-one',
          contentType: 'traffic',
          contentKey: 'radio.civic.evening-traffic',
          priority: 10,
          schedule: {
            type: 'daily',
            startMinuteOfDay: 18 * 60,
            endMinuteOfDay: 22 * 60,
          },
          languageId: 'language:dock-common',
          register: 'general',
          vocabularyKey: null,
          translationDifficulty: 0.2,
          informationHooks: [
            {
              type: 'route-intel',
              factId: 'fact:docks-checkpoint-traffic',
              routeId: 'route:docks-night',
              minimumComprehension: 2,
            },
          ],
          passengerReactions: [
            {
              passengerId: 'passenger:official-clinic-rider',
              reactionKey: 'radio.civic.approved',
            },
          ],
        },
      },
      {
        schemaVersion: 1,
        id: 'broadcast:dockwave-night-music',
        data: {
          stationId: 'radio-station:dockwave',
          contentType: 'music',
          contentKey: 'radio.dockwave.night-music',
          priority: 0,
          schedule: {
            type: 'daily',
            startMinuteOfDay: 18 * 60,
            endMinuteOfDay: 24 * 60,
          },
          languageId: 'language:dock-common',
          register: 'general',
          vocabularyKey: null,
          translationDifficulty: 0,
          informationHooks: [],
          passengerReactions: [
            {
              passengerId: 'passenger:underground-clinic-rider',
              reactionKey: 'radio.dockwave.likes-track',
            },
          ],
        },
      },
      {
        schemaVersion: 1,
        id: 'broadcast:underchannel-clinic-window',
        data: {
          stationId: 'radio-station:underchannel',
          contentType: 'underground',
          contentKey: 'radio.underchannel.clinic-window',
          priority: 20,
          schedule: {
            type: 'daily',
            startMinuteOfDay: 19 * 60,
            endMinuteOfDay: 23 * 60,
          },
          languageId: 'language:dock-common',
          register: 'slang',
          vocabularyKey: 'dock-street',
          translationDifficulty: 0.2,
          informationHooks: [
            {
              type: 'job-intel',
              factId: 'fact:underground-clinic-window',
              jobId: 'job:docks-underground-clinic',
              minimumComprehension: 2,
            },
          ],
          passengerReactions: [
            {
              passengerId: 'passenger:underground-clinic-rider',
              reactionKey: 'radio.underchannel.recognition',
            },
          ],
        },
      },
    ],
  },
  personalPersistence: {
    schemaVersion: 1,
    upgrades: [
      {
        schemaVersion: 1,
        id: 'taxi-upgrade:reinforced-partition-v1',
        data: {
          displayName: 'Reinforced Partition',
          slot: 'partition',
          purchaseCostCredits: 220,
          installationCostCredits: 45,
          legality: 'licensed',
          riskFootprint: 4,
          capabilities: ['cabin.protection'],
        },
      },
      {
        schemaVersion: 1,
        id: 'taxi-upgrade:covert-radio-antenna-v1',
        data: {
          displayName: 'Covert Radio Antenna',
          slot: 'radio',
          purchaseCostCredits: 180,
          installationCostCredits: 35,
          legality: 'illegal',
          riskFootprint: 38,
          capabilities: ['radio.hidden-band'],
        },
      },
      {
        schemaVersion: 1,
        id: 'taxi-upgrade:passenger-observation-camera-v1',
        data: {
          displayName: 'Passenger Observation Camera',
          slot: 'sensor',
          purchaseCostCredits: 150,
          installationCostCredits: 25,
          legality: 'restricted',
          riskFootprint: 18,
          capabilities: ['passenger.observation'],
        },
      },
    ],
    items: [
      {
        schemaVersion: 1,
        id: 'item:docks-clinic-token',
        data: {
          displayName: 'Docks Clinic Token',
          kind: 'souvenir',
          presentationKey: 'souvenir.docks-clinic-token',
          capabilities: [],
        },
      },
    ],
    messages: [
      {
        schemaVersion: 1,
        id: 'message:first-shift-callback',
        data: {
          kind: 'callback',
          senderKey: 'passenger.underground-clinic-rider',
          passengerId: 'passenger:underground-clinic-rider',
          subjectKey: 'message.first-shift.subject',
          bodyKey: 'message.first-shift.body',
        },
      },
    ],
    maintenanceIssues: [
      {
        id: 'brake-pads-worn',
        displayName: 'Worn Brake Pads',
        severity: 'major',
        repairCostCredits: 55,
        conditionRestored: 18,
      },
      {
        id: 'cabin-filter-clogged',
        displayName: 'Clogged Cabin Filter',
        severity: 'minor',
        repairCostCredits: 20,
        conditionRestored: 8,
      },
    ],
  },
  narrativeStories: [
    {
      id: 'foundation-passenger',
      source,
    },
  ],
  personalSpaces: defaultPersonalSpaceCatalog,
  taxiScene: defaultTaxiSceneDefinition,
} as const;

export type ProductionContentInput = typeof productionContent;
