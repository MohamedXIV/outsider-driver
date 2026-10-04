import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { createBootScene } from './createBootScene';

describe('createBootScene', () => {
  it('creates a renderable scene with an active camera in headless mode', () => {
    const engine = new NullEngine();
    const scene = createBootScene(engine);

    expect(scene.activeCamera?.name).toBe('boot-camera');
    expect(scene.getEngine()).toBe(engine);

    scene.render();
    scene.dispose();
    engine.dispose();
  });
});
