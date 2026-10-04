import { describe, expect, it } from 'vitest';
import { createWorldFixture } from '../world/fixtures/worldFixture';
import { createRouteMotionFixture } from './fixtures/routeMotionFixture';
import {
  RouteMotionProfileSchema,
  sampleRouteMotion,
  validateRouteMotionCatalog,
} from './RouteMotionProfiles';

describe('RouteMotionProfiles', () => {
  it('validates one motion profile for every authored route segment', () => {
    const catalog = validateRouteMotionCatalog(
      createRouteMotionFixture(),
      createWorldFixture(),
    );

    expect(catalog.profiles).toHaveLength(1);
  });

  it('interpolates speed, curvature, and surface deterministically', () => {
    const catalog = validateRouteMotionCatalog(
      createRouteMotionFixture(),
      createWorldFixture(),
    );
    const profile = catalog.profiles[0];

    if (profile === undefined) {
      throw new Error('Expected route motion fixture profile.');
    }

    const first = sampleRouteMotion(profile, 0.525);
    const second = sampleRouteMotion(profile, 0.525);

    expect(first).toEqual(second);
    expect(first.targetSpeedMps).toBeGreaterThan(7);
    expect(first.targetSpeedMps).toBeLessThan(11);
    expect(first.curvature).not.toBe(0);
    expect(first.surfaceRoughness).toBeGreaterThan(0.12);
  });

  it('rejects non-monotonic profile progress', () => {
    expect(
      RouteMotionProfileSchema.safeParse({
        segmentId: 'route-segment:docks-night-01',
        samples: [
          {
            progress: 0,
            targetSpeedMps: 5,
            curvature: 0,
            surfaceRoughness: 0,
          },
          {
            progress: 0.7,
            targetSpeedMps: 5,
            curvature: 0,
            surfaceRoughness: 0,
          },
          {
            progress: 0.6,
            targetSpeedMps: 5,
            curvature: 0,
            surfaceRoughness: 0,
          },
          {
            progress: 1,
            targetSpeedMps: 5,
            curvature: 0,
            surfaceRoughness: 0,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
