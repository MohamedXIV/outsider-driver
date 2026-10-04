import source from './foundation-passenger.ink?raw';
import {
  InkNarrativeRuntime,
} from '../../narrative/InkNarrativeRuntime';
import type {
  NarrativeEventSink,
  NarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';

export const foundationPassengerInkSource = source;

export function createFoundationPassengerNarrative(
  queries: NarrativeQueryPort,
  events: NarrativeEventSink,
): InkNarrativeRuntime {
  return InkNarrativeRuntime.fromInkSource(
    foundationPassengerInkSource,
    queries,
    events,
  );
}
