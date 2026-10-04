import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { BabylonSceneOrchestrator } from './BabylonSceneOrchestrator';

describe('BabylonSceneOrchestrator', () => {
  it('activates the taxi through the production scene lifecycle', () => {
    const engine = new NullEngine();
    const scenes = new BabylonSceneOrchestrator(engine);

    expect(scenes.getTaxiScene()).toBeNull();

    const taxi = scenes.showTaxi(defaultTaxiSceneDefinition);

    expect(scenes.getTaxiScene()).toBe(taxi);
    expect(taxi.scene.name).toBe('taxi-scene');

    scenes.render();
    scenes.dispose();
    engine.dispose();
  });

  it('refuses to render after disposal', () => {
    const engine = new NullEngine();
    const scenes = new BabylonSceneOrchestrator(engine);

    scenes.dispose();

    expect(() => {
      scenes.render();
    }).toThrow(/disposed/i);

    engine.dispose();
  });
});
