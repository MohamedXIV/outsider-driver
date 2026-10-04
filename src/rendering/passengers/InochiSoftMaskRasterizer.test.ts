import { describe, expect, it } from 'vitest';
import type {
  InochiDrawCommand,
  InochiDrawFrame,
} from './InochiRuntimeContracts';
import {
  createInochiMaskUvs,
  rasterizeInochiSoftMasks,
} from './InochiSoftMaskRasterizer';

const allocationId = 1;

function drawCommand(
  state: InochiDrawCommand['state'],
  options: Partial<InochiDrawCommand> = {},
): InochiDrawCommand {
  const drawable =
    state === 'normal' || state === 'define-mask';

  return {
    state,
    blendMode: 'normal',
    maskMode: 'mask',
    sourceTextureIds: drawable
      ? [7, null, null, null, null, null, null, null]
      : [null, null, null, null, null, null, null, null],
    allocationId,
    vertexOffset: 0,
    indexOffset: 0,
    elementCount: drawable ? 6 : 0,
    type: 0x101,
    variables: new Uint8Array(64),
    ...options,
  };
}

function frame(
  alpha: number,
  commands: readonly InochiDrawCommand[],
): InochiDrawFrame {
  return {
    vertices: [
      { x: 0, y: 0, u: 0, v: 0 },
      { x: 1, y: 0, u: 1, v: 0 },
      { x: 1, y: 1, u: 1, v: 1 },
      { x: 0, y: 1, u: 0, v: 1 },
    ],
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    textures: [
      {
        id: 7,
        width: 1,
        height: 1,
        channels: 4,
        pixels: new Uint8Array([255, 255, 255, alpha]),
      },
    ],
    allocations: [
      {
        vertexOffset: 0,
        indexOffset: 0,
        indexCount: 6,
        vertexCount: 4,
        allocationId,
      },
    ],
    commands,
    usesBaseVertex: true,
  };
}

const pushMask = drawCommand('push-mask', {
  elementCount: 0,
  sourceTextureIds: [null, null, null, null, null, null, null, null],
});
const popMask = drawCommand('pop-mask', {
  elementCount: 0,
  sourceTextureIds: [null, null, null, null, null, null, null, null],
});

describe('rasterizeInochiSoftMasks', () => {
  it('matches first-level mask accumulation from the reference renderer', () => {
    const result = rasterizeInochiSoftMasks(
      frame(128, [
        pushMask,
        drawCommand('define-mask'),
        drawCommand('normal'),
        popMask,
      ]),
      8,
    );

    expect(result.snapshots).toHaveLength(1);
    const mask = result.snapshots[0];

    if (mask === undefined) {
      throw new Error('Expected mask snapshot.');
    }

    expect(result.snapshotIndexByCommand.get(2)).toBe(0);
    expect(mask.pixels[3 * 8 + 3]).toBeCloseTo(128, -1);
  });

  it('matches dodge mode by writing inverse source alpha', () => {
    const result = rasterizeInochiSoftMasks(
      frame(64, [
        {
          ...pushMask,
          maskMode: 'dodge',
        },
        drawCommand('define-mask', {
          maskMode: 'dodge',
        }),
        drawCommand('normal'),
        popMask,
      ]),
      8,
    );
    const mask = result.snapshots[0];

    if (mask === undefined) {
      throw new Error('Expected dodge mask snapshot.');
    }

    expect(mask.pixels[3 * 8 + 3]).toBeCloseTo(191, -1);
  });

  it('copies the current mask when nesting another mask layer', () => {
    const result = rasterizeInochiSoftMasks(
      frame(64, [
        pushMask,
        drawCommand('define-mask'),
        pushMask,
        drawCommand('define-mask'),
        drawCommand('normal'),
        popMask,
        drawCommand('normal'),
        popMask,
      ]),
      8,
    );

    expect(result.snapshots).toHaveLength(2);
    const nested = result.snapshots[
      result.snapshotIndexByCommand.get(4) ?? -1
    ];
    const outer = result.snapshots[
      result.snapshotIndexByCommand.get(6) ?? -1
    ];

    if (nested === undefined || outer === undefined) {
      throw new Error('Expected nested and outer mask snapshots.');
    }

    expect(outer.pixels[3 * 8 + 3]).toBeCloseTo(64, -1);
    expect(nested.pixels[3 * 8 + 3]).toBeCloseTo(128, -1);
  });

  it('maps global puppet positions to reusable mask UV2 coordinates', () => {
    expect(
      createInochiMaskUvs(
        [
          { x: -10, y: 5, u: 0, v: 0 },
          { x: 10, y: 25, u: 1, v: 1 },
        ],
        {
          minX: -10,
          minY: 5,
          maxX: 10,
          maxY: 25,
        },
      ),
    ).toEqual([0, 0, 1, 1]);
  });
});
