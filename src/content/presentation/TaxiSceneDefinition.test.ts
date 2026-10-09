import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from './defaultTaxiScene';
import { TaxiSceneDefinitionSchema } from './TaxiSceneDefinition';

describe('TaxiSceneDefinition', () => {
  it('JSON-round-trips the production taxi scene definition', () => {
    const serialized = JSON.stringify(defaultTaxiSceneDefinition);
    const parsed = TaxiSceneDefinitionSchema.parse(
      JSON.parse(serialized) as unknown,
    );

    expect(parsed).toEqual(defaultTaxiSceneDefinition);
  });

  it('accepts bounded low-poly cylinders, toruses, and local panel textures', () => {
    const base = defaultTaxiSceneDefinition.assets[0];
    for (const kind of ['cylinder', 'torus', 'plane']) {
      expect(TaxiSceneDefinitionSchema.safeParse({
        ...defaultTaxiSceneDefinition,
        assets: [{ ...base, kind, tessellation: 16, tubeRatio: 0.1, material: { diffuseColor: [1, 1, 1], textureUrl: '/taxi/instruments.svg' } }],
      }).success).toBe(true);
    }
    expect(TaxiSceneDefinitionSchema.safeParse({
      ...defaultTaxiSceneDefinition,
      assets: [{ ...base, kind: 'cylinder', tessellation: 1000 }],
    }).success).toBe(false);
  });

  it('accepts authored headlights and rejects unbounded beam angles', () => {
    const beam = { position: [0, 0.4, 3], direction: [0, -0.1, 1], color: [1, 0.8, 0.5], intensity: 2, range: 40, angleRadians: 0.9 };
    const withBeam = { ...defaultTaxiSceneDefinition, lighting: { ...defaultTaxiSceneDefinition.lighting, headlights: [beam] } };
    expect(TaxiSceneDefinitionSchema.safeParse(withBeam).success).toBe(true);
    expect(TaxiSceneDefinitionSchema.safeParse({ ...withBeam, lighting: { ...withBeam.lighting, headlights: [{ ...beam, angleRadians: 4 }] } }).success).toBe(false);
  });

  it('rejects duplicate presentation asset IDs', () => {
    const firstAsset = defaultTaxiSceneDefinition.assets[0];

    if (firstAsset === undefined) {
      throw new Error('Default taxi scene must contain at least one asset.');
    }

    expect(
      TaxiSceneDefinitionSchema.safeParse({
        ...defaultTaxiSceneDefinition,
        assets: [
          ...defaultTaxiSceneDefinition.assets,
          firstAsset,
        ],
      }).success,
    ).toBe(false);
  });
});
