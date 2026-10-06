import { describe, expect, it } from 'vitest';
import {
  growWasmMemoryToMinimumPages,
  hasWasmStartSection,
  reserveUnmanagedWasmStaging,
  stripWasmStartSection,
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



describe('stripWasmStartSection', () => {
  it('removes the executable Start section without changing surrounding sections', () => {
    const original = wasmBytes(
      0x01, 0x01, 0x00,
      0x08, 0x01, 0x00,
      0x00, 0x01, 0x2a,
    );

    const stripped = stripWasmStartSection(original);

    expect(hasWasmStartSection(original)).toBe(true);
    expect(hasWasmStartSection(stripped)).toBe(false);
    expect(Array.from(new Uint8Array(stripped))).toEqual(
      Array.from(
        new Uint8Array(
          wasmBytes(
            0x01, 0x01, 0x00,
            0x00, 0x01, 0x2a,
          ),
        ),
      ),
    );
  });

  it('preserves a module that has no Start section', () => {
    const original = wasmBytes(
      0x01, 0x01, 0x00,
    );

    expect(
      Array.from(
        new Uint8Array(stripWasmStartSection(original)),
      ),
    ).toEqual(Array.from(new Uint8Array(original)));
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

  it('fails closed for invalid or unsupported page floors', () => {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 2,
    });

    expect(() =>
      growWasmMemoryToMinimumPages(memory, 0),
    ).toThrow(/minimum memory page count/);

    expect(() =>
      growWasmMemoryToMinimumPages(memory, 3),
    ).toThrow(/could not grow WASM memory/);
  });
});
