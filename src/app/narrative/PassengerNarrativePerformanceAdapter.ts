import type { PassengerPerformanceCuePort } from '../ports/PassengerPerformancePort';
import type { NarrativeTurn } from '../../narrative/contracts/NarrativePresentation';

const performanceTagPattern =
  /^performance:([a-z0-9]+(?:[._-][a-z0-9]+)*)$/;

export class PassengerNarrativePerformanceAdapter {
  readonly #performance: PassengerPerformanceCuePort;

  public constructor(
    performance: PassengerPerformanceCuePort,
  ) {
    this.#performance = performance;
  }

  public applyTurn(turn: NarrativeTurn): readonly string[] {
    const cues: string[] = [];

    for (const line of turn.lines) {
      for (const tag of line.tags) {
        const match = performanceTagPattern.exec(tag);

        if (match === null) {
          continue;
        }

        const cueName = match[1];

        if (cueName === undefined) {
          throw new Error(
            `Malformed narrative performance tag: ${tag}`,
          );
        }

        this.#performance.applyCue(cueName);
        cues.push(cueName);
      }
    }

    return cues;
  }
}
