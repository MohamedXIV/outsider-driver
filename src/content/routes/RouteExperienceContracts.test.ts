import { describe, expect, it } from 'vitest';
import { createWorldFixture } from '../world/fixtures/worldFixture';
import { createRouteExperienceFixture } from './fixtures/routeExperienceFixture';
import {
  resolveRouteEnvironment,
  validateRouteExperienceCatalog,
} from './RouteExperienceContracts';

describe('RouteExperienceContracts', () => {
  it('requires typed event, district visual, and scenery coverage', () => {
    const catalog = validateRouteExperienceCatalog(
      createRouteExperienceFixture(),
      createWorldFixture(),
    );

    expect(catalog.events).toHaveLength(1);
    expect(catalog.districtVisuals).toHaveLength(1);
    expect(catalog.segmentScenery).toHaveLength(1);
  });

  it('fails closed when authored route-event behavior is missing', () => {
    const fixture = createRouteExperienceFixture() as {
      events: unknown[];
    };
    fixture.events = [];

    expect(() =>
      validateRouteExperienceCatalog(fixture, createWorldFixture()),
    ).toThrow(/Missing route event experience/);
  });

  it('resolves time and precipitation inputs deterministically', () => {
    const catalog = validateRouteExperienceCatalog(
      createRouteExperienceFixture(),
      createWorldFixture(),
    );
    const profile = catalog.districtVisuals[0];

    if (profile === undefined) {
      throw new Error('Expected district visual fixture.');
    }

    const first = resolveRouteEnvironment(profile, {
      daylightFactor: 0,
      precipitation: 1,
    });
    const second = resolveRouteEnvironment(profile, {
      daylightFactor: 0,
      precipitation: 1,
    });

    expect(first).toEqual(second);
    expect(first.ambientIntensity).toBeCloseTo(0.62 * 0.82 * 0.72);
    expect(first.fogDensity).toBeCloseTo(0.016);
  });
});
