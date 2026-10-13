import { InkNarrativeRuntime } from './InkNarrativeRuntime';
import { compileInkSource } from './compileInkSource';
import type {
  NarrativeEventSink,
  NarrativeQueryPort,
} from './contracts/NarrativeBoundary';

/** Compile free-form Ink only in authoring/dev/tests, not game startup. */
export function createDevelopmentInkRuntimeFromSource(
  source: string,
  queries: NarrativeQueryPort,
  events: NarrativeEventSink,
): InkNarrativeRuntime {
  return new InkNarrativeRuntime(
    compileInkSource(source),
    queries,
    events,
  );
}
