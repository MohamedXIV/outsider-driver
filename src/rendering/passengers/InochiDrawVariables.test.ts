import { describe, expect, it } from 'vitest';
import type { InochiDrawCommand } from './InochiRuntimeContracts';
import {
  INOCHI_ANIMATED_PART_TYPE_ID,
  INOCHI_COMPOSITE_TYPE_ID,
  INOCHI_PART_TYPE_ID,
  parseInochiCompositeVariables,
  parseInochiPartVariables,
} from './InochiDrawVariables';

function command(type: number): InochiDrawCommand {
  const variables = new Uint8Array(64);
  const view = new DataView(variables.buffer);

  [
    [0, 0.8],
    [4, 0.7],
    [8, 0.6],
    [12, 0.1],
    [16, 0.2],
    [20, 0.3],
    [28, 0.5],
    [32, 1.25],
  ].forEach(([offset, value]) => {
    if (offset === undefined || value === undefined) {
      throw new Error('Invalid variable fixture.');
    }

    view.setFloat32(offset, value, true);
  });

  return {
    state: 'normal',
    blendMode: 'normal',
    maskMode: 'mask',
    sourceTextureIds: [1, null, null, null, null, null, null, null],
    allocationId: 1,
    vertexOffset: 0,
    indexOffset: 0,
    elementCount: 3,
    type,
    variables,
  };
}

describe('Inochi draw variables', () => {
  it.each([
    INOCHI_PART_TYPE_ID,
    INOCHI_ANIMATED_PART_TYPE_ID,
  ])('decodes PartVars for type 0x%s', (typeId) => {
    const variables = parseInochiPartVariables(
      command(typeId),
    );

    expect(variables.opacity).toBeCloseTo(0.5);
    expect(variables.emissionStrength).toBeCloseTo(1.25);
    variables.tint.forEach((value, index) => {
      expect(value).toBeCloseTo([0.8, 0.7, 0.6][index] ?? 0);
    });
    variables.screenTint.forEach((value, index) => {
      expect(value).toBeCloseTo([0.1, 0.2, 0.3][index] ?? 0);
    });
  });

  it('decodes CompositeVars without reading Part-only emission bytes', () => {
    const variables = parseInochiCompositeVariables(
      command(INOCHI_COMPOSITE_TYPE_ID),
    );

    expect(variables.opacity).toBeCloseTo(0.5);
    variables.tint.forEach((value, index) => {
      expect(value).toBeCloseTo([0.8, 0.7, 0.6][index] ?? 0);
    });
    variables.screenTint.forEach((value, index) => {
      expect(value).toBeCloseTo([0.1, 0.2, 0.3][index] ?? 0);
    });
  });

  it('fails closed for unknown drawable variable layouts', () => {
    expect(() => {
      parseInochiPartVariables(command(0x9999));
    }).toThrow(/not a supported Part variant/);
  });
});
