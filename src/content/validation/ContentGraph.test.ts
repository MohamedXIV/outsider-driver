import { describe, expect, it } from 'vitest';
import {
  ContentValidationError,
  validateContentGraph,
} from './ContentGraph';

describe('validateContentGraph', () => {
  it('accepts stable cross-references between authored content nodes', () => {
    const graph = validateContentGraph({
      schemaVersion: 1,
      nodes: [
        {
          id: 'passenger:mina',
          references: [
            {
              id: 'location:dock-7',
              expectedKind: 'location',
            },
          ],
        },
        {
          id: 'location:dock-7',
        },
      ],
    });

    expect(graph.nodes).toHaveLength(2);
  });

  it('fails duplicate IDs instead of relying on array position', () => {
    expect(() =>
      validateContentGraph({
        schemaVersion: 1,
        nodes: [
          { id: 'passenger:mina' },
          { id: 'passenger:mina' },
        ],
      }),
    ).toThrow(ContentValidationError);
  });

  it('fails missing cross-references', () => {
    expect(() =>
      validateContentGraph({
        schemaVersion: 1,
        nodes: [
          {
            id: 'passenger:mina',
            references: [{ id: 'location:missing' }],
          },
        ],
      }),
    ).toThrow(/references missing content/);
  });

  it('fails references whose semantic kind does not match the contract', () => {
    expect(() =>
      validateContentGraph({
        schemaVersion: 1,
        nodes: [
          {
            id: 'passenger:mina',
            references: [
              {
                id: 'district:docks',
                expectedKind: 'location',
              },
            ],
          },
          { id: 'district:docks' },
        ],
      }),
    ).toThrow(/expected district:docks to be location, got district/);
  });
});
