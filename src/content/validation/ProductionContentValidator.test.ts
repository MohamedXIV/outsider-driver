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
    expect(validated.routeExperience.segmentScenery).toHaveLength(1);
    expect(validated.translator.languages).toHaveLength(1);
    expect(validated.translator.packs).toHaveLength(2);
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
