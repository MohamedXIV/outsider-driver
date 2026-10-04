import { describe, expect, it, vi } from 'vitest';
import {
  OfficialInochiRuntimeAdapter,
  type OfficialInochiBindings,
} from './OfficialInochiRuntimeAdapter';

function createBindings() {
  const memory = new ArrayBuffer(2048);
  const view = new DataView(memory);
  const vertexPointer = 128;
  const indexPointer = 256;
  const allocationPointer = 320;
  const commandPointer = 384;
  const texturePointer = 700;
  const texturePixelsPointer = 1024;

  [
    -10, -20, 0, 0,
    10, -20, 1, 0,
    0, 20, 0.5, 1,
  ].forEach((value, index) => {
    view.setFloat32(vertexPointer + index * 4, value, true);
  });

  [0, 1, 2].forEach((value, index) => {
    view.setUint32(indexPointer + index * 4, value, true);
  });

  [0, 0, 3, 3, 1].forEach((value, index) => {
    view.setUint32(allocationPointer + index * 4, value, true);
  });

  view.setUint32(commandPointer, texturePointer, true);
  const stateOffset = commandPointer + 8 * 4;
  view.setUint32(stateOffset, 0, true);
  view.setUint32(stateOffset + 4, 0, true);
  view.setUint32(stateOffset + 8, 0, true);
  view.setUint32(stateOffset + 12, 1, true);
  view.setUint32(stateOffset + 16, 0, true);
  view.setUint32(stateOffset + 20, 0, true);
  view.setUint32(stateOffset + 24, 3, true);
  view.setUint32(stateOffset + 28, 0x101, true);

  new Uint8Array(memory, texturePixelsPointer, 4).set([
    10, 20, 30, 255,
  ]);

  const setParameterValue = vi.fn();
  const updatePuppet = vi.fn();
  const drawPuppet = vi.fn();
  const freePuppet = vi.fn();

  const bindings: OfficialInochiBindings = {
    loadPuppet: () => 99,
    freePuppet,
    getPuppetName: () => 'Official Fixture',
    getPuppetAuthor: () => 'Inochi2D',
    updatePuppet,
    drawPuppet,
    getDrawList: () => 500,
    getTextureCache: () => 600,
    getParameterPointers: () => [800],
    getParameterName: () => 'HeadYaw',
    getParameterActive: () => true,
    getParameterLowerBounds: () => [-1],
    getParameterUpperBounds: () => [1],
    getParameterValue: () => [0],
    setParameterValue,
    getTexturePointers: () => [texturePointer],
    getTextureWidth: () => 1,
    getTextureHeight: () => 1,
    getTextureChannels: () => 4,
    getTexturePixelsPointer: () => texturePixelsPointer,
    getDrawListUseBaseVertex: () => true,
    getDrawCommands: () => ({
      pointer: commandPointer,
      count: 1,
    }),
    getDrawVertices: () => ({
      pointer: vertexPointer,
      bytes: 3 * 16,
    }),
    getDrawIndices: () => ({
      pointer: indexPointer,
      bytes: 3 * 4,
    }),
    getDrawAllocations: () => ({
      pointer: allocationPointer,
      count: 1,
    }),
    getMemoryBuffer: () => memory,
  };

  return {
    bindings,
    setParameterValue,
    updatePuppet,
    drawPuppet,
    freePuppet,
  };
}

describe('OfficialInochiRuntimeAdapter', () => {
  it('extracts current official wrapper data into a pointer-free draw frame', () => {
    const harness = createBindings();
    const runtime = new OfficialInochiRuntimeAdapter(harness.bindings);
    const puppet = runtime.loadPuppet(new Uint8Array([1, 2, 3]).buffer);

    expect(puppet.name).toBe('Official Fixture');
    expect(puppet.author).toBe('Inochi2D');
    expect(puppet.listParameters()).toEqual([
      {
        name: 'HeadYaw',
        active: true,
        lowerBounds: [-1],
        upperBounds: [1],
        value: [0],
      },
    ]);

    puppet.setParameter('HeadYaw', [0.5]);
    puppet.update(0.016);
    const frame = puppet.renderFrame(0.016);

    expect(harness.setParameterValue).toHaveBeenCalledWith(800, [0.5]);
    expect(harness.updatePuppet).toHaveBeenCalledWith(99, 0.016);
    expect(harness.drawPuppet).toHaveBeenCalledWith(99, 0.016);
    expect(frame.vertices).toEqual([
      { x: -10, y: -20, u: 0, v: 0 },
      { x: 10, y: -20, u: 1, v: 0 },
      { x: 0, y: 20, u: 0.5, v: 1 },
    ]);
    expect(Array.from(frame.indices)).toEqual([0, 1, 2]);
    expect(frame.textures).toEqual([
      {
        id: 700,
        width: 1,
        height: 1,
        channels: 4,
        pixels: new Uint8Array([10, 20, 30, 255]),
      },
    ]);
    expect(frame.commands[0]).toMatchObject({
      state: 'normal',
      blendMode: 'normal',
      allocationId: 1,
      sourceTextureIds: [700, null, null, null, null, null, null, null],
    });
  });

  it('copies texture pixels out of mutable wasm memory', () => {
    const harness = createBindings();
    const runtime = new OfficialInochiRuntimeAdapter(harness.bindings);
    const puppet = runtime.loadPuppet(new Uint8Array([1]).buffer);
    const frame = puppet.renderFrame(0);

    const memory = new Uint8Array(harness.bindings.getMemoryBuffer());
    memory[1024] = 99;

    expect(frame.textures[0]?.pixels[0]).toBe(10);
  });

  it('owns puppet disposal without exposing raw pointers to callers', () => {
    const harness = createBindings();
    const runtime = new OfficialInochiRuntimeAdapter(harness.bindings);
    const puppet = runtime.loadPuppet(new Uint8Array([1]).buffer);

    puppet.dispose();
    puppet.dispose();

    expect(harness.freePuppet).toHaveBeenCalledTimes(1);
    expect(() => puppet.renderFrame(0)).toThrow(/disposed/);
  });
});
