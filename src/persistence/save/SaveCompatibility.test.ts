import { describe, expect, it } from 'vitest';
import v1 from './fixtures/v1.json';
import v2 from './fixtures/v2.json';
import v3 from './fixtures/v3.json';
import v4 from './fixtures/v4.json';
import v5 from './fixtures/v5.json';
import v6 from './fixtures/v6.json';
import v7 from './fixtures/v7.json';
import v8 from './fixtures/v8.json';
import v9 from './fixtures/v9.json';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  gameSaveCodec,
} from './gameSave';

interface HistoricalFixture {
  readonly schemaVersion: number;
  readonly savedAt: string;
  readonly state: Record<string, unknown>;
}

const fixtures = [
  v1,
  v2,
  v3,
  v4,
  v5,
  v6,
  v7,
  v8,
  v9,
] satisfies readonly HistoricalFixture[];

const stableIdPattern =
  /^[a-z][a-z0-9-]*:[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function collectStableIds(
  value: unknown,
  target = new Set<string>(),
): ReadonlySet<string> {
  if (typeof value === 'string') {
    if (stableIdPattern.test(value)) {
      target.add(value);
    }

    return target;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStableIds(item, target);
    }

    return target;
  }

  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) {
      collectStableIds(item, target);
    }
  }

  return target;
}

function cloneFixture(
  fixture: HistoricalFixture,
): HistoricalFixture {
  return structuredClone(fixture);
}

describe('production save compatibility matrix', () => {
  it('contains exactly one repository fixture for every supported save version', () => {
    const expected = Array.from(
      { length: CURRENT_SAVE_SCHEMA_VERSION },
      (_, index) => index + 1,
    );

    expect(
      fixtures.map((fixture) => fixture.schemaVersion),
    ).toEqual(expected);
  });

  it.each(fixtures)(
    'migrates v$schemaVersion deterministically to the current schema',
    (fixture) => {
      const first = gameSaveCodec.decode(cloneFixture(fixture));
      const second = gameSaveCodec.decode(cloneFixture(fixture));

      expect(first).toEqual(second);
      expect(first.schemaVersion).toBe(
        CURRENT_SAVE_SCHEMA_VERSION,
      );
      expect(first.savedAt).toBe(fixture.savedAt);

      const firstSerialized = gameSaveCodec.serialize(
        first.state,
        fixture.savedAt,
      );
      const secondSerialized = gameSaveCodec.serialize(
        second.state,
        fixture.savedAt,
      );

      expect(firstSerialized).toBe(secondSerialized);
    },
  );

  it.each(fixtures)(
    'preserves stable IDs introduced by v$schemaVersion',
    (fixture) => {
      const historicalIds = collectStableIds(fixture.state);
      const migratedIds = collectStableIds(
        gameSaveCodec.decode(cloneFixture(fixture)).state,
      );

      for (const id of historicalIds) {
        expect(migratedIds.has(id), id).toBe(true);
      }
    },
  );

  it.each(fixtures)(
    'fails closed when v$schemaVersion state is corrupted',
    (fixture) => {
      const corrupted: HistoricalFixture = {
        ...cloneFixture(fixture),
        state: {
          ...fixture.state,
          __corruptUnknownField: true,
        },
      };

      expect(() => {
        gameSaveCodec.decode(corrupted);
      }).toThrow(
        `Save state for version ${String(fixture.schemaVersion)} is invalid`,
      );
    },
  );

  it('rejects malformed envelopes with an actionable boundary error', () => {
    expect(() => {
      gameSaveCodec.decode({
        schemaVersion: 9,
        savedAt: 'not-a-timestamp',
        state: {},
      });
    }).toThrow(/Save envelope is invalid/);

    expect(() => {
      gameSaveCodec.decode({
        schemaVersion: 9,
        savedAt: '2026-01-02T03:04:05.000Z',
        state: {},
        unexpected: true,
      });
    }).toThrow(/Save envelope is invalid/);
  });

  it('rejects malformed JSON with a save-specific error', () => {
    expect(() => {
      gameSaveCodec.deserialize('{"schemaVersion":9,');
    }).toThrow(/Save data is not valid JSON/);
  });

  it('rejects a future schema before attempting partial repair', () => {
    expect(() => {
      gameSaveCodec.decode({
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION + 1,
        savedAt: '2026-01-02T03:04:05.000Z',
        state: {},
      });
    }).toThrow(
      /newer than supported version/,
    );
  });
});
