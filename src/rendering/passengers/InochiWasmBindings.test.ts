import { describe, expect, it } from 'vitest';
import {
  hasWasmStartSection,
  reserveUnmanagedWasmStaging,
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


describe('reserveUnmanagedWasmStaging', () => {
  it('reserves page-aligned caller-owned bytes after current memory', () => {
    const memory = new WebAssembly.Memory({
      initial: 2,
      maximum: 8,
    });

    const staging = reserveUnmanagedWasmStaging(
      memory,
      65_537,
    );

    expect(staging).toEqual({
      pointer: 2 * 65_536,
      capacity: 2 * 65_536,
    });
    expect(memory.buffer.byteLength).toBe(4 * 65_536);

    new Uint8Array(
      memory.buffer,
      staging.pointer,
      4,
    ).set([1, 2, 3, 4]);

    expect(
      Array.from(
        new Uint8Array(memory.buffer, staging.pointer, 4),
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it('fails closed for invalid sizes or an exhausted memory maximum', () => {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 1,
    });

    expect(() =>
      reserveUnmanagedWasmStaging(memory, 0),
    ).toThrow(/staging byte length/);

    expect(() =>
      reserveUnmanagedWasmStaging(memory, 1),
    ).toThrow(/could not reserve/);
  });
});
