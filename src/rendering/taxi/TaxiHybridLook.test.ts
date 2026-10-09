import { Color3 } from '@babylonjs/core/Maths/math.color';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createTaxiScene } from './createTaxiScene';
import {
  createTaxiHybridLook,
  taxiSpriteTint,
  DEFAULT_HYBRID_LOOK,
} from './TaxiHybridLook';

describe('reversible painterly-cel taxi visual lab', () => {
  it('attaches only to authored non-emissive taxi materials and is disposable', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const sceneMaterialCount = taxi.scene.materials.length;
    const look = createTaxiHybridLook(taxi.scene);
    expect(look.materialCount).toBeGreaterThan(0);
    expect(look.materialCount).toBeLessThan(sceneMaterialCount);
    const display = taxi.scene.getMeshByName('taxi-asset-instruments')?.material;
    // The actual emissive instrument display keeps its original unlit finish.
    expect(display).toBeInstanceOf(StandardMaterial);
    if (!(display instanceof StandardMaterial)) throw new Error('Expected an emissive StandardMaterial');
    expect(display.disableLighting).toBe(true);
    look.apply({ ...DEFAULT_HYBRID_LOOK, style: 'hybrid', steps: 3, ambientFloor: 0.3 });
    expect(taxi.scene.materials.length).toBe(sceneMaterialCount);
    look.apply(DEFAULT_HYBRID_LOOK);
    look.dispose();
    look.dispose();
    // The Babylon scene is still alive when the Lab is reopened.
    const reopened = createTaxiHybridLook(taxi.scene);
    expect(reopened.materialCount).toBe(look.materialCount);
    reopened.apply({ ...DEFAULT_HYBRID_LOOK, style: 'hybrid' });
    reopened.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('preserves original sprite brightness when tint is off', () => {
    const base = new Color3(0.9, 0.5, 0.2);
    const neon = new Color3(0.3, 0.3, 0.9);
    expect(taxiSpriteTint(0, base, neon, 0).asArray()).toEqual([1, 1, 1]);
    const warm = taxiSpriteTint(1, base, neon, 0);
    const cool = taxiSpriteTint(1, base, neon, 1);
    expect(warm.r).toBeGreaterThan(warm.b);
    expect(cool.b).toBeGreaterThan(cool.r);
    expect(Math.max(...cool.asArray())).toBeLessThanOrEqual(1);
    expect(Math.max(...warm.asArray())).toBeLessThanOrEqual(1);
  });
});
