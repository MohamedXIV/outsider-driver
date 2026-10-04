import { describe, expect, it } from 'vitest';
import {
  createFoundationPassengerNarrative,
  foundationPassengerInkSource,
} from '../content/narrative/foundationPassengerStory';
import { entityId } from '../domain/ids/EntityId';
import {
  NarrativeDomainEventSchema,
  type NarrativeDomainEvent,
  type NarrativeQueryPort,
} from './contracts/NarrativeBoundary';
import { compileInkSource } from './compileInkSource';
import { InkNarrativeRuntime } from './InkNarrativeRuntime';

function createQueries(hasFact: boolean): NarrativeQueryPort {
  return {
    hasFact: () => hasFact,
    hasClaim: () => false,
    getPassengerSuspicion: () => 12,
    getCityAttention: () => 3,
  };
}

describe('Ink narrative boundary', () => {
  it('compiles the repository Ink source and loads it through inkjs', () => {
    const compiled = compileInkSource(foundationPassengerInkSource);

    expect(compiled.json.length).toBeGreaterThan(0);
    expect(compiled.declaredExternals).toEqual([
      'GAME_HAS_FACT',
      'GAME_REVEAL_FACT',
      'GAME_ADJUST_CITY_ATTENTION',
    ]);
  });

  it('queries domain state and emits typed consequences without storing domain truth in Ink', () => {
    const emitted: NarrativeDomainEvent[] = [];
    const runtime = createFoundationPassengerNarrative(
      createQueries(false),
      {
        emit: (event) => {
          emitted.push(event);
        },
      },
    );

    const opening = runtime.continueUntilChoiceOrEnd();

    expect(opening.lines.map((line) => line.text)).toContain(
      'Passenger: Customs lights sweep every cab after midnight.',
    );
    expect(opening.choices).toHaveLength(2);
    expect(emitted).toEqual([
      {
        type: 'knowledge.reveal',
        factId: entityId('fact', 'docks-checkpoint-rumor'),
      },
    ]);

    const ending = runtime.choose(0);

    expect(ending.ended).toBe(true);
    expect(ending.lines.map((line) => line.text)).toContain(
      'Passenger: Keep moving.',
    );
    expect(emitted.at(-1)).toEqual({
      type: 'city-attention.adjust',
      delta: 1,
      reason: 'checkpoint-conversation',
    });
  });

  it('rejects invalid domain event arguments at the boundary', () => {
    const source = `
EXTERNAL GAME_REVEAL_FACT(fact_id)
-> start
=== start ===
~ GAME_REVEAL_FACT("passenger:not-a-fact")
-> END
`;

    const runtime = InkNarrativeRuntime.fromInkSource(
      source,
      createQueries(false),
      {
        emit: (event) => {
          NarrativeDomainEventSchema.parse(event);
        },
      },
    );

    expect(() => runtime.continueUntilChoiceOrEnd()).toThrow(
      /Expected a stable fact:<slug> ID/,
    );
  });
});
