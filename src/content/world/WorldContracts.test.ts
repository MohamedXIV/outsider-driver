import { describe, expect, it } from 'vitest';
import { createWorldFixture } from './fixtures/worldFixture';
import { validateWorldContentCatalog } from './WorldContracts';

describe('WorldContentCatalog', () => {
  it('validates and JSON-round-trips the real production contracts', () => {
    const validated = validateWorldContentCatalog(createWorldFixture());
    const roundTripped = validateWorldContentCatalog(
      JSON.parse(JSON.stringify(validated)) as unknown,
    );

    expect(roundTripped).toEqual(validated);
  });

  it('fails a missing district reference', () => {
    expect(() =>
      validateWorldContentCatalog(
        createWorldFixture({
          locationDistrictId: 'district:missing',
        }),
      ),
    ).toThrow(/references missing content/);
  });

  it('fails a missing route segment instead of treating order as identity', () => {
    expect(() =>
      validateWorldContentCatalog(
        createWorldFixture({
          routeSegmentId: 'route-segment:missing',
        }),
      ),
    ).toThrow(/references missing content/);
  });
});
