import { describe, expect, it } from 'vitest';
import {
  INOCHI_DRAW_ALLOCATION_BYTES,
  INOCHI_DRAW_COMMAND_BYTES,
  INOCHI_VERTEX_BYTES,
  parseInochiAllocations,
  parseInochiDrawCommands,
  parseInochiIndices,
  parseInochiVertices,
  validateInochiDrawFrame,
} from './InochiWasmAbi';

describe('InochiWasmAbi', () => {
  it('parses the current wasm32 vertex and uint32 index layout', () => {
    const memory = new ArrayBuffer(INOCHI_VERTEX_BYTES * 2 + 12);
    const view = new DataView(memory);

    const values = [
      1, 2, 0.25, 0.5,
      -3, 4, 0.75, 1,
    ];

    values.forEach((value, index) => {
      view.setFloat32(index * 4, value, true);
    });

    const indexOffset = INOCHI_VERTEX_BYTES * 2;
    [2, 1, 0].forEach((value, index) => {
      view.setUint32(indexOffset + index * 4, value, true);
    });

    expect(
      parseInochiVertices(memory, 0, INOCHI_VERTEX_BYTES * 2),
    ).toEqual([
      { x: 1, y: 2, u: 0.25, v: 0.5 },
      { x: -3, y: 4, u: 0.75, v: 1 },
    ]);
    expect(
      Array.from(parseInochiIndices(memory, indexOffset, 12)),
    ).toEqual([2, 1, 0]);
  });

  it('parses current draw command and allocation structs without leaking pointers', () => {
    const commandMemory = new ArrayBuffer(INOCHI_DRAW_COMMAND_BYTES);
    const command = new DataView(commandMemory);

    command.setUint32(0, 101, true);
    command.setUint32(4, 0, true);
    const stateOffset = 8 * 4;
    command.setUint32(stateOffset, 1, true);
    command.setUint32(stateOffset + 4, 2, true);
    command.setUint32(stateOffset + 8, 1, true);
    command.setUint32(stateOffset + 12, 7, true);
    command.setUint32(stateOffset + 16, 11, true);
    command.setUint32(stateOffset + 20, 13, true);
    command.setUint32(stateOffset + 24, 6, true);
    command.setUint32(stateOffset + 28, 0x101, true);
    new Uint8Array(commandMemory, stateOffset + 32, 64).fill(9);

    expect(parseInochiDrawCommands(commandMemory, 0, 1)).toEqual([
      {
        sourceTextureIds: [101, null, null, null, null, null, null, null],
        state: 'define-mask',
        blendMode: 'screen',
        maskMode: 'dodge',
        allocationId: 7,
        vertexOffset: 11,
        indexOffset: 13,
        elementCount: 6,
        type: 0x101,
        variables: new Uint8Array(64).fill(9),
      },
    ]);

    const allocationMemory = new ArrayBuffer(INOCHI_DRAW_ALLOCATION_BYTES);
    const allocation = new DataView(allocationMemory);
    [3, 5, 9, 7, 12].forEach((value, index) => {
      allocation.setUint32(index * 4, value, true);
    });

    expect(parseInochiAllocations(allocationMemory, 0, 1)).toEqual([
      {
        vertexOffset: 3,
        indexOffset: 5,
        indexCount: 9,
        vertexCount: 7,
        allocationId: 12,
      },
    ]);
  });

  it('rejects malformed buffers and invalid frame references', () => {
    expect(() => parseInochiVertices(new ArrayBuffer(17), 0, 17)).toThrow(
      /vertex buffer byte length/,
    );
    expect(() => parseInochiIndices(new ArrayBuffer(5), 0, 5)).toThrow(
      /index buffer byte length/,
    );

    expect(() =>
      validateInochiDrawFrame({
        vertices: [
          { x: 0, y: 0, u: 0, v: 0 },
          { x: 1, y: 0, u: 1, v: 0 },
          { x: 0, y: 1, u: 0, v: 1 },
        ],
        indices: new Uint32Array([0, 1, 2]),
        textures: [],
        allocations: [
          {
            vertexOffset: 0,
            indexOffset: 0,
            indexCount: 3,
            vertexCount: 3,
            allocationId: 1,
          },
        ],
        commands: [
          {
            state: 'normal',
            blendMode: 'normal',
            maskMode: 'mask',
            sourceTextureIds: [404],
            allocationId: 1,
            vertexOffset: 0,
            indexOffset: 0,
            elementCount: 3,
            type: 0x101,
            variables: new Uint8Array(64),
          },
        ],
        usesBaseVertex: true,
      }),
    ).toThrow(/unknown texture 404/);
  });
});
