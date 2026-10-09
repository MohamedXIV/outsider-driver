import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../../content/presentation/defaultTaxiScene';
import { createTaxiScene } from '../../taxi/createTaxiScene';
import { PassengerStylization } from './PassengerStylization';

describe('passenger grounding and outline lifecycle', () => {
  it('keeps optional shadow meshes disabled by default and disposes all resources', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const originalMeshCount = taxi.scene.meshes.length;
    const treatment = new PassengerStylization(taxi.scene, taxi.anchors.passengerSeat);
    const cushion = taxi.scene.getMeshByName('passenger-contact-shadow-seat');
    const back = taxi.scene.getMeshByName('passenger-contact-shadow-back');
    const outline = taxi.scene.getMeshByName('passenger-ink-outline-plane');
    expect(cushion?.isEnabled()).toBe(false);
    expect(back?.isEnabled()).toBe(false);
    expect(outline?.isEnabled()).toBe(false);
    treatment.setShadow(0.5);
    expect(cushion?.isEnabled()).toBe(true);
    expect(back?.isEnabled()).toBe(true);
    treatment.setShadow(0);
    expect(cushion?.isEnabled()).toBe(false);
    treatment.setOutline(null, 'mint-elf', 4, 1);
    expect(outline?.isEnabled()).toBe(false);
    treatment.dispose();
    treatment.dispose();
    expect(taxi.scene.meshes.length).toBe(originalMeshCount);
    expect(taxi.scene.getMeshByName('passenger-ink-outline-plane')).toBeNull();
    taxi.scene.dispose();
    engine.dispose();
  });
});
