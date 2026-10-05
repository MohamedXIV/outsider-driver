import { describe, expect, it } from 'vitest';
import { raiseDefinedWasmMemoryMinimum } from './prepare-inochi-runtime.mjs';

function wasmBytes(...body) {
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
  ]);
}

describe('raiseDefinedWasmMemoryMinimum', () => {
  it('raises a defined memory minimum before instantiation', () => {
    const source = wasmBytes(
      0x05,
      0x03,
      0x01,
      0x00,
      0x13,
    );

    const patched = raiseDefinedWasmMemoryMinimum(
      source,
      1024,
    );

    expect([...patched]).toEqual([
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      0x05,
      0x04,
      0x01,
      0x00,
      0x80,
      0x08,
    ]);
    expect(WebAssembly.validate(patched)).toBe(true);
  });

  it('leaves an already-large enough minimum byte-identical', () => {
    const source = wasmBytes(
      0x05,
      0x04,
      0x01,
      0x00,
      0x80,
      0x08,
    );

    const patched = raiseDefinedWasmMemoryMinimum(
      source,
      1024,
    );

    expect([...patched]).toEqual([...source]);
  });

  it('rejects a configured minimum above the declared maximum', () => {
    const source = wasmBytes(
      0x05,
      0x06,
      0x01,
      0x01,
      0x13,
      0x80,
      0x04,
    );

    expect(() => {
      raiseDefinedWasmMemoryMinimum(source, 1024);
    }).toThrow(/exceeds declared maximum/);
  });
});
