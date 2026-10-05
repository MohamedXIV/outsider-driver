import { describe, expect, it } from 'vitest';
import { productionContent } from '../production/ProductionContent';
import {
  ProductionContentValidationError,
  validateProductionContent,
} from './ProductionContentValidator';

describe('production content validation', () => {
  it('validates the exact canonical content manifest used by production', () => {
    const validated = validateProductionContent(productionContent);

    expect(validated.world.routes.map((route) => route.id)).toEqual([
      'route:docks-night',
    ]);
    expect(validated.narrativeStories.map((story) => story.id)).toEqual([
      'foundation-passenger',
    ]);
    expect(validated.routeMotion.profiles).toHaveLength(1);
    expect(validated.passengerPerformance.profiles).toHaveLength(2);
    expect(validated.routeExperience.segmentScenery).toHaveLength(1);
    expect(validated.translator.languages).toHaveLength(1);
    expect(validated.translator.packs).toHaveLength(2);
    expect(validated.radio.stations).toHaveLength(3);
    expect(validated.radio.broadcasts).toHaveLength(3);
    expect(validated.relationships.profiles).toHaveLength(2);
    expect(validated.personalSpaces.spaces.map((space) => space.id)).toEqual([
      'personal-space:garage',
      'personal-space:home',
    ]);
    expect(validated.personalPersistence.upgrades).toHaveLength(3);
    expect(validated.personalPersistence.items).toHaveLength(1);
    expect(validated.personalPersistence.messages).toHaveLength(1);
  });

  it('rejects a passenger that references a missing narrative story', () => {
    const broken = {
      ...productionContent,
      passengers: {
        schemaVersion: 1,
        passengers: [
          {
            schemaVersion: 1,
            id: 'passenger:missing-story',
            data: {
              displayName: 'Missing Story Passenger',
              lifecycleKind: 'recurring',
              narrativeStoryId: 'story-that-does-not-exist',
            },
          },
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /references missing narrative story story-that-does-not-exist/,
    );
  });

  it('rejects performance profiles for passengers outside the canonical catalog', () => {
    const broken = {
      ...productionContent,
      passengerPerformance: {
        schemaVersion: 1,
        profiles: [
          {
            passengerId: 'passenger:missing-performance-rider',
            channels: {
              talk: [],
              blink: [],
              gaze: [],
              head: [],
              body: [],
            },
            expressions: [],
            cues: [],
          },
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /Passenger performance profile references unknown passenger/,
    );
  });

  it('rejects narrative performance tags that are missing from the passenger profile', () => {
    const story = productionContent.narrativeStories[0];

    const broken = {
      ...productionContent,
      narrativeStories: [
        {
          ...story,
          source: story.source.replace(
            'performance:guarded',
            'performance:missing-cue',
          ),
        },
      ],
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /narrative requests missing performance cue missing-cue/,
    );
  });

  it('rejects jobs whose passenger or world references do not exist', () => {
    const broken = {
      ...productionContent,
      jobs: [
        {
          id: 'job:missing-passenger',
          passengerId: 'passenger:nobody',
          pickupLocationId: 'location:docks-taxi-rank',
          destinationLocationId: 'location:docks-clinic',
          routeId: 'route:docks-night',
          availability: {
            opensAt: {
              day: 1,
              minuteOfDay: 0,
            },
            closesAt: {
              day: 1,
              minuteOfDay: 120,
            },
          },
          source: {
            kind: 'underground',
            minimumUndergroundAccess: 0,
            riskFootprint: 10,
          },
          fare: {
            baseCredits: 10,
            perMinuteCredits: 1,
            completionBonusCredits: 0,
          },
          expenses: {
            dispatchFeeCredits: 1,
            operatingCreditsPerMinute: 0,
          },
          completionEffects: {
            officialStandingDelta: 0,
            undergroundAccessDelta: 1,
          },
        },
      ],
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /Unknown passenger reference: passenger:nobody/,
    );
  });

  it('rejects translator packs that reference missing languages', () => {
    const broken = {
      ...productionContent,
      translator: {
        ...productionContent.translator,
        packs: [
          {
            ...productionContent.translator.packs[0],
            data: {
              ...productionContent.translator.packs[0].data,
              capabilities: [
                {
                  ...productionContent.translator.packs[0].data.capabilities[0],
                  languageId: 'language:missing',
                },
              ],
            },
          },
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /translator-pack:civic-basic-v1 references missing content language:missing/,
    );
  });

  it('rejects radio intel that references a missing production job', () => {
    const broken = {
      ...productionContent,
      radio: {
        ...productionContent.radio,
        broadcasts: [
          {
            ...productionContent.radio.broadcasts[2],
            data: {
              ...productionContent.radio.broadcasts[2].data,
              informationHooks: [
                {
                  type: 'job-intel',
                  factId: 'fact:missing-job',
                  jobId: 'job:missing-radio-target',
                  minimumComprehension: 2,
                },
              ],
            },
          },
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /references unknown job intel target job:missing-radio-target/,
    );
  });

  it('rejects personal-space assets that reference unknown persistent flags', () => {
    const garage = productionContent.personalSpaces.spaces.find(
      (space) => space.kind === 'garage',
    );
    const home = productionContent.personalSpaces.spaces.find(
      (space) => space.kind === 'home',
    );

    if (garage === undefined || home === undefined) {
      throw new Error('Expected production garage and home spaces.');
    }

    const inspectionAsset = garage.assets.find(
      (asset) => asset.id === 'inspection-light-strip',
    );

    if (inspectionAsset === undefined) {
      throw new Error('Expected garage inspection-light fixture.');
    }

    const broken = {
      ...productionContent,
      personalSpaces: {
        ...productionContent.personalSpaces,
        spaces: [
          {
            ...garage,
            assets: garage.assets.map((asset) =>
              asset.id === inspectionAsset.id
                ? {
                    ...asset,
                    visibility: {
                      flagId: 'missing-flag',
                      visibleWhen: true,
                    },
                  }
                : asset,
            ),
          },
          home,
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /references unknown visibility flag missing-flag/,
    );
  });

  it('rejects personal callbacks that reference missing passengers', () => {
    const broken = {
      ...productionContent,
      personalPersistence: {
        ...productionContent.personalPersistence,
        messages: [
          {
            ...productionContent.personalPersistence.messages[0],
            data: {
              ...productionContent.personalPersistence.messages[0].data,
              passengerId: 'passenger:missing-callback-rider',
            },
          },
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /references unknown passenger passenger:missing-callback-rider/,
    );
  });

  it('rejects a recurring passenger without an authored recurrence policy', () => {
    const broken = {
      ...productionContent,
      relationships: {
        ...productionContent.relationships,
        profiles: productionContent.relationships.profiles.map(
          (profile) =>
            profile.passengerId ===
            'passenger:underground-clinic-rider'
              ? {
                  passengerId: profile.passengerId,
                  trust: profile.trust,
                  affection: profile.affection,
                  initialHumanAttitude:
                    profile.initialHumanAttitude,
                }
              : profile,
        ),
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /requires an authored recurrence policy/,
    );
  });

  it('rejects Ink source that violates the production external contract', () => {
    const broken = {
      ...productionContent,
      narrativeStories: [
        {
          id: 'broken-story',
          source: [
            'EXTERNAL GAME_UNRESTRICTED_MUTATION(value)',
            '-> END',
          ].join('\n'),
        },
      ],
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /unsupported game external: GAME_UNRESTRICTED_MUTATION/,
    );
  });

  it('rejects unreachable route structure', () => {
    const broken = {
      ...productionContent,
      world: {
        ...productionContent.world,
        routeEvents: [
          ...productionContent.world.routeEvents,
          {
            schemaVersion: 1,
            id: 'route-event:orphan',
            data: {
              hookId: 'orphan.event',
              atProgress: 0.5,
            },
          },
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /Unreachable route event is not used by any segment: route-event:orphan/,
    );
  });

  it('rejects invalid authored enum values before runtime', () => {
    const broken = {
      ...productionContent,
      passengers: {
        schemaVersion: 1,
        passengers: [
          {
            schemaVersion: 1,
            id: 'passenger:invalid-kind',
            data: {
              displayName: 'Invalid Passenger',
              lifecycleKind: 'temporary-demo-only',
              narrativeStoryId: 'foundation-passenger',
            },
          },
        ],
      },
    };

    expect(() => validateProductionContent(broken)).toThrow(
      ProductionContentValidationError,
    );
    expect(() => validateProductionContent(broken)).toThrow(
      /\[passengers\]/,
    );
  });

  it('rejects duplicate narrative story IDs', () => {
    const first = productionContent.narrativeStories[0];

    const broken = {
      ...productionContent,
      narrativeStories: [
        first,
        {
          ...first,
        },
      ],
    };

    expect(() => validateProductionContent(broken)).toThrow(
      /Duplicate narrative story ID: foundation-passenger/,
    );
  });

  it('aggregates independent validation failures for authoring feedback', () => {
    const broken = {
      ...productionContent,
      passengers: {
        schemaVersion: 1,
        passengers: [
          {
            schemaVersion: 1,
            id: 'passenger:bad-kind',
            data: {
              displayName: 'Bad Kind',
              lifecycleKind: 'invalid',
              narrativeStoryId: 'missing-story',
            },
          },
        ],
      },
      narrativeStories: [
        {
          id: 'broken-story',
          source: 'EXTERNAL GAME_UNKNOWN()\n-> END',
        },
      ],
    };

    try {
      validateProductionContent(broken);
      throw new Error('Expected production content validation to fail.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ProductionContentValidationError);

      if (!(error instanceof ProductionContentValidationError)) {
        throw error;
      }

      expect(error.issues.map((issue) => issue.scope)).toEqual(
        expect.arrayContaining(['passengers', 'narrative']),
      );
    }
  });
});
