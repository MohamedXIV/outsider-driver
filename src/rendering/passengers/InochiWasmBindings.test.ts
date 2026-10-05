import { describe, expect, it } from 'vitest';
import {
  hasWasmStartSection,
  readDefinedWasmMemoryLimits,
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


describe('readDefinedWasmMemoryLimits', () => {
  it('decodes bounded defined memory limits', () => {
    expect(
      readDefinedWasmMemoryLimits(
        wasmBytes(
          0x05,
          0x05,
          0x01,
          0x01,
          0x13,
          0x80,
          0x10,
        ),
      ),
    ).toEqual({
      minimumPages: 19,
      maximumPages: 2048,
    });
  });

  it('reports an omitted maximum as unbounded', () => {
    expect(
      readDefinedWasmMemoryLimits(
        wasmBytes(
          0x05,
          0x03,
          0x01,
          0x00,
          0x13,
        ),
      ),
    ).toEqual({
      minimumPages: 19,
      maximumPages: null,
    });
  });

  it('returns null when memory is imported instead of defined', () => {
    expect(readDefinedWasmMemoryLimits(wasmBytes())).toBeNull();
  });
});
