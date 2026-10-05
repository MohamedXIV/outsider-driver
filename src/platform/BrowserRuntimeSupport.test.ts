import { describe, expect, it } from 'vitest';
import {
  evaluateBrowserRuntimeSupport,
} from './BrowserRuntimeSupport';

describe('evaluateBrowserRuntimeSupport', () => {
  it('accepts the supported production capability set', () => {
    expect(
      evaluateBrowserRuntimeSupport({
        webgl: true,
        webassembly: true,
      }),
    ).toEqual({
      webgl: true,
      webassembly: true,
      supported: true,
      missing: [],
    });
  });

  it('reports every missing required capability deterministically', () => {
    expect(
      evaluateBrowserRuntimeSupport({
        webgl: false,
        webassembly: false,
      }),
    ).toEqual({
      webgl: false,
      webassembly: false,
      supported: false,
      missing: ['webgl', 'webassembly'],
    });
  });
});
