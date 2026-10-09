import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createTaxiScene } from './createTaxiScene';
import { createTaxiPainterlySurfaces } from './TaxiPainterlySurfaces';

describe('taxi painterly surface experiment', () => {
  it('replaces authored texture slots only on demand and restores object identity', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const seat = taxi.scene.getMeshByName('taxi-asset-passenger-seat-cushion')?.material;
    const fascia = taxi.scene.getMeshByName('taxi-asset-dashboard-cream-fascia')?.material;
    const instruments = taxi.scene.getMeshByName('taxi-asset-instruments')?.material;
    expect(seat).toBeInstanceOf(StandardMaterial);
    expect(fascia).toBeInstanceOf(StandardMaterial);
    if (!(seat instanceof StandardMaterial) || !(fascia instanceof StandardMaterial)) {
      throw new Error('Missing expected taxi materials');
    }
    const oldSeat = seat.diffuseTexture;
    const oldFascia = fascia.diffuseTexture;
    const oldInstruments = instruments;
    const editor = createTaxiPainterlySurfaces(taxi.scene);
    expect(editor.materialCount).toBeGreaterThan(1);
    expect(seat.diffuseTexture).toBe(oldSeat);
    expect(fascia.diffuseTexture).toBe(oldFascia);
    editor.setPainted(true);
    expect(seat.diffuseTexture).not.toBe(oldSeat);
    expect(fascia.diffuseTexture).not.toBe(oldFascia);
    expect(instruments).toBe(oldInstruments);
    editor.setPainted(false);
    expect(seat.diffuseTexture).toBe(oldSeat);
    expect(fascia.diffuseTexture).toBe(oldFascia);
    editor.setPainted(true);
    editor.dispose();
    editor.dispose();
    expect(seat.diffuseTexture).toBe(oldSeat);
    expect(fascia.diffuseTexture).toBe(oldFascia);
    taxi.scene.dispose();
    engine.dispose();
  });
});
