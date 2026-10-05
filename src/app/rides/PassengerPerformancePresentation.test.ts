import { describe, expect, it } from 'vitest';
import { resolvePassengerPerformanceCue } from './PassengerPerformancePresentation';

describe('resolvePassengerPerformanceCue', () => {
  it('uses the latest semantic performance tag from presented narrative lines', () => {
    expect(
      resolvePassengerPerformanceCue({
        lines: [
          {
            text: 'First',
            tags: ['performance:guarded'],
          },
          {
            text: 'Second',
            tags: ['other:tag', 'performance:firm'],
          },
        ],
        choices: [],
        ended: false,
      }),
    ).toBe('firm');
  });

  it('returns null when narrative presentation does not request performance', () => {
    expect(
      resolvePassengerPerformanceCue({
        lines: [
          {
            text: 'No performance direction',
            tags: ['speaker:passenger'],
          },
        ],
        choices: [],
        ended: false,
      }),
    ).toBeNull();
  });

  it('fails loud for an empty performance tag', () => {
    expect(() =>
      resolvePassengerPerformanceCue({
        lines: [
          {
            text: 'Broken',
            tags: ['performance:'],
          },
        ],
        choices: [],
        ended: false,
      }),
    ).toThrow(/must name a cue/);
  });
});
