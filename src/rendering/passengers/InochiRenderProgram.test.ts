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
  it('tracks the current runtime push -> define -> draw -> pop mask sequence', () => {
    const program = compileInochiRenderProgram(
      frame([
        command('push-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
        command('define-mask'),
        command('normal'),
        command('pop-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
      ]),
    );

    expect(program.maskLayerCount).toBe(1);
    expect(program.maximumMaskDepth).toBe(1);
    expect(program.operations).toMatchObject([
      { kind: 'push-mask', layerId: 0, parentMaskLayerIds: [] },
      { kind: 'define-mask', layerId: 0, parentMaskLayerIds: [] },
      { kind: 'draw', activeMaskLayerIds: [0] },
      { kind: 'pop-mask', layerId: 0 },
    ]);
  });

  it('tracks nested mask scopes and source-level dodge modes', () => {
    const program = compileInochiRenderProgram(
      frame([
        command('push-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
        command('define-mask'),
        command('push-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
          maskMode: 'dodge',
        }),
        command('define-mask', { maskMode: 'dodge' }),
        command('normal'),
        command('pop-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
        command('normal'),
        command('pop-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
      ]),
    );

    expect(program.maximumMaskDepth).toBe(2);
    expect(program.operations).toMatchObject([
      { kind: 'push-mask', layerId: 0 },
      { kind: 'define-mask', layerId: 0 },
      { kind: 'push-mask', layerId: 1, parentMaskLayerIds: [0] },
      { kind: 'define-mask', layerId: 1, parentMaskLayerIds: [0] },
      { kind: 'draw', activeMaskLayerIds: [0, 1] },
      { kind: 'pop-mask', layerId: 1 },
      { kind: 'draw', activeMaskLayerIds: [0] },
      { kind: 'pop-mask', layerId: 0 },
    ]);
  });

  it('supports compositeEnd then mask work before compositeBlit', () => {
    const program = compileInochiRenderProgram(
      frame([
        command('composite-begin', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
        command('normal'),
        command('composite-end', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
        command('push-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
        command('define-mask'),
        command('composite-blit'),
        command('pop-mask', {
          elementCount: 0,
          sourceTextureIds: [null, null, null, null, null, null, null, null],
        }),
      ]),
    );

    expect(program.maximumCompositeDepth).toBe(1);
    expect(program.operations.map((operation) => operation.kind)).toEqual([
      'composite-begin',
      'draw',
      'composite-end',
      'push-mask',
      'define-mask',
      'composite-blit',
      'pop-mask',
    ]);
  });

  it('rejects unbalanced state instead of producing a plausible wrong frame', () => {
    expect(() => {
      compileInochiRenderProgram(
        frame([
          command('define-mask'),
        ]),
      );
    }).toThrow(/no active mask layer/);

    expect(() => {
      compileInochiRenderProgram(
        frame([
          command('push-mask', {
            elementCount: 0,
            sourceTextureIds: [null, null, null, null, null, null, null, null],
          }),
          command('define-mask'),
        ]),
      );
    }).toThrow(/active mask layers/);

    expect(() => {
      compileInochiRenderProgram(
        frame([
          command('composite-begin', {
            elementCount: 0,
            sourceTextureIds: [null, null, null, null, null, null, null, null],
          }),
          command('normal'),
        ]),
      );
    }).toThrow(/incomplete composite/);
  });
});
