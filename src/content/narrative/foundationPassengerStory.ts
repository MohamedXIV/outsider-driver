import source from './foundation-passenger.ink?raw';
import type { InkNarrativeRuntime } from '../../narrative/InkNarrativeRuntime';
import { createDevelopmentInkRuntimeFromSource } from '../../narrative/createDevelopmentInkRuntimeFromSource';
import type {
  NarrativeEventSink,
  NarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';

export const foundationPassengerInkSource = source;

export function createFoundationPassengerNarrative(
  queries: NarrativeQueryPort,
  events: NarrativeEventSink,
): InkNarrativeRuntime {
  return createDevelopmentInkRuntimeFromSource(
    foundationPassengerInkSource,
    queries,
    events,
  );
}
