import { describe, expect, it } from 'vitest';
import { PassengerNarrativePerformanceAdapter } from './PassengerNarrativePerformanceAdapter';

describe('PassengerNarrativePerformanceAdapter', () => {
  it('turns authored semantic line tags into named performance cues', () => {
    const cues: string[] = [];
    const adapter =
      new PassengerNarrativePerformanceAdapter({
        applyCue: (cueName) => {
          cues.push(cueName);
        },
      });

    expect(
      adapter.applyTurn({
        lines: [
          {
            text: 'Passenger: Keep moving.',
            tags: [
              'speaker:passenger',
              'performance:guarded',
            ],
          },
          {
            text: 'Passenger: Now.',
            tags: ['performance:urgent-look'],
          },
        ],
        choices: [],
        ended: false,
      }),
    ).toEqual(['guarded', 'urgent-look']);
    expect(cues).toEqual(['guarded', 'urgent-look']);
  });

  it('ignores unrelated narrative tags and does not inspect choice tags before selection', () => {
    const cues: string[] = [];
    const adapter =
      new PassengerNarrativePerformanceAdapter({
        applyCue: (cueName) => {
          cues.push(cueName);
        },
      });

    adapter.applyTurn({
      lines: [
        {
          text: 'Passenger: Hello.',
          tags: ['speaker:passenger'],
        },
      ],
      choices: [
        {
          index: 0,
          text: 'Answer.',
          tags: ['performance:choice-not-yet-selected'],
        },
      ],
      ended: false,
    });

    expect(cues).toEqual([]);
  });
});
