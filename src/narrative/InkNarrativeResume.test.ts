import { describe, expect, it } from 'vitest';
import {
  foundationPassengerInkSource,
} from '../content/narrative/foundationPassengerStory';
import type {
  NarrativeDomainEvent,
  NarrativeQueryPort,
} from './contracts/NarrativeBoundary';
import { createDevelopmentInkRuntimeFromSource } from './createDevelopmentInkRuntimeFromSource';

const queries: NarrativeQueryPort = {
  hasFact: () => false,
  hasClaim: () => false,
  coverIdentityMatches: () => false,
  wouldContradictClaim: () => false,
  getPassengerSuspicion: () => 0,
  getCityAttention: () => 0,
};

describe('InkNarrativeRuntime resume', () => {
  it('restores at a choice boundary and continues without replaying prior events', () => {
    const firstEvents: NarrativeDomainEvent[] = [];
    const first = createDevelopmentInkRuntimeFromSource(
      foundationPassengerInkSource,
      queries,
      {
        emit: (event) => {
          firstEvents.push(event);
        },
      },
    );

    const opening = first.continueUntilChoiceOrEnd();
    expect(opening.choices).toHaveLength(2);
    expect(firstEvents).toHaveLength(1);

    const savedState = first.serializeState();
    const restoredEvents: NarrativeDomainEvent[] = [];
    const restored = createDevelopmentInkRuntimeFromSource(
      foundationPassengerInkSource,
      queries,
      {
        emit: (event) => {
          restoredEvents.push(event);
        },
      },
    );

    restored.restoreState(savedState);
    const ending = restored.choose(0);

    expect(ending.ended).toBe(true);
    expect(restoredEvents).toEqual([
      {
        type: 'city-attention.adjust',
        delta: 1,
        reason: 'checkpoint-conversation',
      },
    ]);
  });
});
