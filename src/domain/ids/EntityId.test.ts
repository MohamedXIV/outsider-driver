import { describe, expect, it } from 'vitest';
import {
  EntityIdSchema,
  entityId,
  entityIdSchema,
  getEntityKind,
} from './EntityId';

describe('EntityId', () => {
  it('creates stable typed IDs with explicit kind prefixes', () => {
    const passengerId = entityId('passenger', 'mina-01');

    expect(passengerId).toBe('passenger:mina-01');
    expect(getEntityKind(passengerId)).toBe('passenger');
  });

  it.each([
    'Passenger:mina',
    'passenger:',
    'passenger:HasUppercase',
    'passenger:spaces are bad',
    'unknown:mina',
    'passenger:mina:other',
  ])('rejects unstable or unknown ID %s', (value) => {
    expect(EntityIdSchema.safeParse(value).success).toBe(false);
  });

  it('rejects a valid ID when the expected entity kind differs', () => {
    const passengerSchema = entityIdSchema('passenger');

    expect(passengerSchema.safeParse('location:dock-7').success).toBe(false);
  });
});
