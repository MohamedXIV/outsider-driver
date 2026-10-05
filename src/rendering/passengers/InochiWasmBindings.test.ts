import { describe, expect, it } from 'vitest';
import {
  growWasmMemoryToMinimumPages,
  hasWasmStartSection,
} from './InochiWasmBindings';

function wasmBytes(...body: number[]): ArrayBuffer {
  return Uint8Array.from([
    0x00,
    0x61,
    0x73,
    0x6d,
    0x01,
    0x00,
    0x00,
    0x00,
    ...body,
  ]).buffer;
}

describe('hasWasmStartSection', () => {
  it('detects a WASM start section so constructors are not rerun', () => {
    expect(
      hasWasmStartSection(
        wasmBytes(
          0x08,
          0x01,
          0x00,
        ),
      ),
    ).toBe(true);
  });

  it('returns false when the module has no start section', () => {
    expect(hasWasmStartSection(wasmBytes())).toBe(false);
  });

  it('rejects malformed module headers and section lengths', () => {
    expect(() => {
      hasWasmStartSection(new Uint8Array([0, 1, 2]).buffer);
    }).toThrow(/Invalid WebAssembly module header/);

    expect(() => {
      hasWasmStartSection(
        wasmBytes(
          0x01,
          0x05,
          0x00,
        ),
      );
    }).toThrow(/section extends beyond module bytes/);
  });
});


describe('growWasmMemoryToMinimumPages', () => {
  it('grows exported memory to the requested page floor', () => {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 8,
    });

    expect(
      growWasmMemoryToMinimumPages(memory, 4),
    ).toBe(4);
    expect(memory.buffer.byteLength).toBe(4 * 65_536);
  });

  it('does not shrink an already larger memory', () => {
    const memory = new WebAssembly.Memory({
      initial: 3,
      maximum: 8,
    });

    expect(
      growWasmMemoryToMinimumPages(memory, 2),
    ).toBe(3);
  });

  it('rejects invalid page floors', () => {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 8,
    });

    expect(() =>
      growWasmMemoryToMinimumPages(memory, 0),
    ).toThrow(/minimum memory page count/);
  });
});
