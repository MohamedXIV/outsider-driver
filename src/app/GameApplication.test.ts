import { describe, expect, it } from 'vitest';
import { GameApplication } from './GameApplication';
import { GameSession } from './session/GameSession';
import type { RenderingRuntimePort } from './ports/RenderingRuntimePort';

class FakeRenderingRuntime implements RenderingRuntimePort {
  public starts = 0;
  public disposals = 0;

  public start(): void {
    this.starts += 1;
  }

  public dispose(): void {
    this.disposals += 1;
  }
}

describe('GameApplication', () => {
  it('starts its rendering runtime exactly once', () => {
    const rendering = new FakeRenderingRuntime();
    const application = new GameApplication(rendering);

    application.start();
    application.start();

    expect(rendering.starts).toBe(1);
  });

  it('disposes its rendering runtime exactly once', () => {
    const rendering = new FakeRenderingRuntime();
    const application = new GameApplication(rendering);

    application.start();
    application.dispose();
    application.dispose();

    expect(rendering.disposals).toBe(1);
  });

  it('owns and disposes the production game session', () => {
    const rendering = new FakeRenderingRuntime();
    const session = GameSession.open({
      load: () => null,
      save: () => {},
    });
    const application = new GameApplication(rendering, session);

    expect(application.getSession()).toBe(session);
    application.start();
    application.dispose();

    expect(() => session.exportState()).toThrow(/disposed/i);
    expect(rendering.disposals).toBe(1);
  });

  it('refuses to restart after disposal', () => {
    const rendering = new FakeRenderingRuntime();
    const application = new GameApplication(rendering);

    application.dispose();

    expect(() => {
      application.start();
    }).toThrow(/disposed/i);
  });
});
