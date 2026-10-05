import * as z from 'zod';
import type { NarrativeTurn } from '../../narrative/contracts/NarrativePresentation';

const performanceCueSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const PERFORMANCE_TAG_PREFIX = 'performance:';

export function resolvePassengerPerformanceCue(
  turn: NarrativeTurn,
): string | null {
  let resolved: string | null = null;

  for (const line of turn.lines) {
    for (const tag of line.tags) {
      if (!tag.startsWith(PERFORMANCE_TAG_PREFIX)) {
        continue;
      }

      const cue = tag.slice(PERFORMANCE_TAG_PREFIX.length).trim();

      if (cue.length === 0) {
        throw new Error(
          'Narrative performance tag must name a cue.',
        );
      }

      resolved = performanceCueSchema.parse(cue);
    }
  }

  return resolved;
}
