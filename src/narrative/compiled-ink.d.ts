declare module '*.ink?compiled' {
  import type { CompiledInkStory } from './compileInkSource';
  const story: CompiledInkStory;
  export default story;
}
