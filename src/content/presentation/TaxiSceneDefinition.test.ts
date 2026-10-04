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
