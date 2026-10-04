import { describe, expect, it } from 'vitest';
import type {
  InochiDrawCommand,
  InochiDrawFrame,
} from './InochiRuntimeContracts';
import { compileInochiRenderProgram } from './InochiRenderProgram';

const textureId = 7;
const allocationId = 1;

function command(
  state: InochiDrawCommand['state'],
  options: Partial<InochiDrawCommand> = {},
): InochiDrawCommand {
  const drawable =
    state === 'normal' ||
    state === 'define-mask' ||
    state === 'composite-blit';

  return {
    state,
    blendMode: 'normal',
    maskMode: 'mask',
    sourceTextureIds: drawable
      ? [textureId, null, null, null, null, null, null, null]
      : [null, null, null, null, null, null, null, null],
    allocationId,
    vertexOffset: 0,
    indexOffset: 0,
    elementCount: drawable ? 3 : 0,
    type: 0x101,
    variables: new Uint8Array(64),
    ...options,
  };
}

function frame(commands: readonly InochiDrawCommand[]): InochiDrawFrame {
  return {
    vertices: [
      { x: 0, y: 0, u: 0, v: 0 },
      { x: 1, y: 0, u: 1, v: 0 },
      { x: 0, y: 1, u: 0, v: 1 },
    ],
    indices: new Uint32Array([0, 1, 2]),
    textures: [
      {
        id: textureId,
        width: 1,
        height: 1,
        channels: 4,
        pixels: new Uint8Array([255, 255, 255, 255]),
      },
    ],
    allocations: [
      {
        vertexOffset: 0,
        indexOffset: 0,
        indexCount: 3,
        vertexCount: 3,
        allocationId,
      },
    ],
    commands,
    usesBaseVertex: true,
  };
}

describe('compileInochiRenderProgram', () => {
  it('tracks nested soft-mask scope without flattening dodge semantics', () => {
    const program = compileInochiRenderProgram(
      frame([
        command('define-mask'),
        command('push-mask', { maskMode: 'mask' }),
        command('normal'),
        command('define-mask', { maskMode: 'dodge' }),
        command('push-mask', { maskMode: 'dodge' }),
        command('normal'),
        command('pop-mask'),
        command('pop-mask'),
      ]),
    );

    expect(program.maskLayerCount).toBe(2);
    expect(program.maximumMaskDepth).toBe(2);
    expect(program.operations).toMatchObject([
      { kind: 'define-mask', layerId: 0, parentMaskLayerIds: [] },
      { kind: 'push-mask', layerId: 0, mode: 'mask' },
      { kind: 'draw', activeMaskLayerIds: [0] },
      { kind: 'define-mask', layerId: 1, parentMaskLayerIds: [0] },
      { kind: 'push-mask', layerId: 1, mode: 'dodge' },
      { kind: 'draw', activeMaskLayerIds: [0, 1] },
      { kind: 'pop-mask', layerId: 1 },
      { kind: 'pop-mask', layerId: 0 },
    ]);
  });

  it('supports compositeEnd then mask definition before compositeBlit', () => {
    const program = compileInochiRenderProgram(
      frame([
        command('composite-begin'),
        command('normal'),
        command('composite-end'),
        command('define-mask'),
        command('push-mask'),
        command('composite-blit'),
        command('pop-mask'),
      ]),
    );

    expect(program.maximumCompositeDepth).toBe(1);
    expect(program.operations.map((operation) => operation.kind)).toEqual([
      'composite-begin',
      'draw',
      'composite-end',
      'define-mask',
      'push-mask',
      'composite-blit',
      'pop-mask',
    ]);
  });

  it('rejects unbalanced state instead of producing a visually plausible wrong frame', () => {
    expect(() => {
      compileInochiRenderProgram(
        frame([command('pop-mask')]),
      );
    }).toThrow(/no active mask layer/);

    expect(() => {
      compileInochiRenderProgram(
        frame([
          command('composite-begin'),
          command('normal'),
        ]),
      );
    }).toThrow(/incomplete composite/);

    expect(() => {
      compileInochiRenderProgram(
        frame([command('define-mask')]),
      );
    }).toThrow(/unpushed mask definition/);
  });
});
