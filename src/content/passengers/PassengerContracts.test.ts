import { describe, expect, it } from 'vitest';
import { createPassengerFixture } from './fixtures/passengerFixture';
import { validatePassengerCatalog } from './PassengerContracts';

describe('PassengerCatalog', () => {
  it('supports routine, recurring, and story passengers through one contract', () => {
    const catalog = validatePassengerCatalog(createPassengerFixture());

    expect(
      catalog.passengers.map((passenger) => passenger.data.lifecycleKind),
    ).toEqual(['routine', 'recurring', 'story']);
    expect(
      new Set(
        catalog.passengers.map(
          (passenger) => passenger.data.narrativeStoryId,
        ),
      ),
    ).toEqual(new Set(['foundation-passenger']));
  });

  it('rejects duplicate passenger IDs', () => {
    const fixture = createPassengerFixture() as {
      passengers: unknown[];
    };
    fixture.passengers.push(fixture.passengers[0]);

    expect(() => validatePassengerCatalog(fixture)).toThrow(
      /Duplicate content ID/,
    );
  });
});
