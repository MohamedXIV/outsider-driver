import compiledFoundationPassenger from './foundation-passenger.ink?compiled';
import type { CompiledInkStory } from '../../narrative/compileInkSource';

// Runtime-only translation of authored story IDs to Vite-compiled assets.
// The authored productionContent manifest stays strict and source-first.
const compiledStories: Readonly<Record<string, CompiledInkStory>> = {
  'foundation-passenger': compiledFoundationPassenger,
};

export function getCompiledProductionInkStory(storyId: string): CompiledInkStory {
  const story = compiledStories[storyId];
  if (story === undefined) {
    throw new Error(`Unknown precompiled Ink story: ${storyId}`);
  }
  return story;
}
