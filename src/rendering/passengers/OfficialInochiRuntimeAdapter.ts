import {
  parseInochiAllocations,
  parseInochiDrawCommands,
  parseInochiIndices,
  parseInochiVertices,
  validateInochiDrawFrame,
} from './InochiWasmAbi';
import type {
  InochiDrawFrame,
  InochiParameterDescriptor,
  InochiPuppetRuntimeHandle,
  InochiRuntimePort,
  InochiTextureFrame,
} from './InochiRuntimeContracts';

interface PointerSpan {
  readonly pointer: number;
  readonly count: number;
}

interface ByteSpan {
  readonly pointer: number;
  readonly bytes: number;
}

/**
 * Thin facade over the official Inochi2D TypeScript wrapper plus the four
 * raw draw-list exports that are still stubs in the upstream wrapper.
 *
 * The adapter owns no WebAssembly implementation details beyond the documented
 * wasm32 ABI parsed in InochiWasmAbi.
 */
export interface OfficialInochiBindings {
  loadPuppet(data: ArrayBuffer): number;
  freePuppet(puppetPointer: number): void;
  getPuppetName(puppetPointer: number): string;
  getPuppetAuthor(puppetPointer: number): string;
  updatePuppet(puppetPointer: number, deltaSeconds: number): void;
  drawPuppet(puppetPointer: number, deltaSeconds: number): void;
  getDrawList(puppetPointer: number): number;
  getTextureCache(puppetPointer: number): number;
  getParameterPointers(puppetPointer: number): readonly number[];

  getParameterName(parameterPointer: number): string;
  getParameterActive(parameterPointer: number): boolean;
  getParameterLowerBounds(parameterPointer: number): readonly number[];
  getParameterUpperBounds(parameterPointer: number): readonly number[];
  getParameterValue(parameterPointer: number): readonly number[];
  setParameterValue(
    parameterPointer: number,
    values: readonly number[],
  ): void;

  getTexturePointers(textureCachePointer: number): readonly number[];
  getTextureWidth(texturePointer: number): number;
  getTextureHeight(texturePointer: number): number;
  getTextureChannels(texturePointer: number): number;
  getTexturePixelsPointer(texturePointer: number): number;

  getDrawListUseBaseVertex(drawListPointer: number): boolean;
  getDrawCommands(drawListPointer: number): PointerSpan;
  getDrawVertices(drawListPointer: number): ByteSpan;
  getDrawIndices(drawListPointer: number): ByteSpan;
  getDrawAllocations(drawListPointer: number): PointerSpan;

  getMemoryBuffer(): ArrayBuffer;
}

function requirePointer(pointer: number, label: string): number {
  if (!Number.isInteger(pointer) || pointer <= 0) {
    throw new Error(
      `Inochi ${label} returned an invalid pointer: ${String(pointer)}`,
    );
  }

  return pointer;
}

function requireTextureChannels(value: number): 1 | 2 | 3 | 4 {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  throw new Error(
    `Unsupported Inochi texture channel count: ${String(value)}`,
  );
}

function copyTexture(
  bindings: OfficialInochiBindings,
  texturePointer: number,
): InochiTextureFrame {
  const width = bindings.getTextureWidth(texturePointer);
  const height = bindings.getTextureHeight(texturePointer);
  const channels = requireTextureChannels(
    bindings.getTextureChannels(texturePointer),
  );
  const pixelsPointer = requirePointer(
    bindings.getTexturePixelsPointer(texturePointer),
    'texture pixels',
  );
  const byteLength = width * height * channels;

  if (
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0
  ) {
    throw new Error(
      `Invalid Inochi texture dimensions: ${String(width)}x${String(height)}`,
    );
  }

  const pixels = new Uint8Array(
    bindings.getMemoryBuffer(),
    pixelsPointer,
    byteLength,
  );

  return {
    id: texturePointer,
    width,
    height,
    channels,
    pixels: new Uint8Array(pixels),
  };
}

class OfficialInochiPuppetHandle
  implements InochiPuppetRuntimeHandle
{
  readonly #bindings: OfficialInochiBindings;
  readonly #puppetPointer: number;
  readonly #parameterPointerByName = new Map<string, number>();
  #disposed = false;

  public constructor(
    bindings: OfficialInochiBindings,
    puppetPointer: number,
  ) {
    this.#bindings = bindings;
    this.#puppetPointer = requirePointer(
      puppetPointer,
      'puppet load',
    );

    for (const pointer of bindings.getParameterPointers(
      this.#puppetPointer,
    )) {
      const parameterPointer = requirePointer(pointer, 'parameter');
      const name = bindings.getParameterName(parameterPointer);

      if (this.#parameterPointerByName.has(name)) {
        throw new Error(
          `Duplicate Inochi parameter name is not supported by the bridge: ${name}`,
        );
      }

      this.#parameterPointerByName.set(name, parameterPointer);
    }
  }

  public get name(): string {
    this.#assertAlive();
    return this.#bindings.getPuppetName(this.#puppetPointer);
  }

  public get author(): string {
    this.#assertAlive();
    return this.#bindings.getPuppetAuthor(this.#puppetPointer);
  }

  public listParameters(): readonly InochiParameterDescriptor[] {
    this.#assertAlive();

    return [...this.#parameterPointerByName.entries()].map(
      ([name, pointer]) => ({
        name,
        lowerBounds: [
          ...this.#bindings.getParameterLowerBounds(pointer),
        ],
        upperBounds: [
          ...this.#bindings.getParameterUpperBounds(pointer),
        ],
        value: [...this.#bindings.getParameterValue(pointer)],
        active: this.#bindings.getParameterActive(pointer),
      }),
    );
  }

  public setParameter(
    name: string,
    values: readonly number[],
  ): void {
    this.#assertAlive();
    const pointer = this.#parameterPointerByName.get(name);

    if (pointer === undefined) {
      throw new Error(`Unknown Inochi parameter: ${name}`);
    }

    this.#bindings.setParameterValue(pointer, values);
  }

  public update(deltaSeconds: number): void {
    this.#assertAlive();
    this.#bindings.updatePuppet(this.#puppetPointer, deltaSeconds);
  }

  public renderFrame(deltaSeconds: number): InochiDrawFrame {
    this.#assertAlive();
    this.#bindings.drawPuppet(this.#puppetPointer, deltaSeconds);

    const drawListPointer = requirePointer(
      this.#bindings.getDrawList(this.#puppetPointer),
      'draw list',
    );
    const commands = this.#bindings.getDrawCommands(
      drawListPointer,
    );
    const vertices = this.#bindings.getDrawVertices(
      drawListPointer,
    );
    const indices = this.#bindings.getDrawIndices(drawListPointer);
    const allocations = this.#bindings.getDrawAllocations(
      drawListPointer,
    );
    const textureCachePointer = requirePointer(
      this.#bindings.getTextureCache(this.#puppetPointer),
      'texture cache',
    );

    const frame: InochiDrawFrame = {
      vertices: parseInochiVertices(
        this.#bindings.getMemoryBuffer(),
        vertices.pointer,
        vertices.bytes,
      ),
      indices: parseInochiIndices(
        this.#bindings.getMemoryBuffer(),
        indices.pointer,
        indices.bytes,
      ),
      allocations: parseInochiAllocations(
        this.#bindings.getMemoryBuffer(),
        allocations.pointer,
        allocations.count,
      ),
      commands: parseInochiDrawCommands(
        this.#bindings.getMemoryBuffer(),
        commands.pointer,
        commands.count,
      ),
      textures: this.#bindings
        .getTexturePointers(textureCachePointer)
        .map((pointer) =>
          copyTexture(
            this.#bindings,
            requirePointer(pointer, 'texture'),
          ),
        ),
      usesBaseVertex:
        this.#bindings.getDrawListUseBaseVertex(drawListPointer),
    };

    return validateInochiDrawFrame(frame);
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#bindings.freePuppet(this.#puppetPointer);
    this.#disposed = true;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error(
        'Cannot use a disposed official Inochi puppet handle.',
      );
    }
  }
}

export class OfficialInochiRuntimeAdapter
  implements InochiRuntimePort
{
  readonly #bindings: OfficialInochiBindings;

  public constructor(bindings: OfficialInochiBindings) {
    this.#bindings = bindings;
  }

  public loadPuppet(data: ArrayBuffer): InochiPuppetRuntimeHandle {
    const puppetPointer = this.#bindings.loadPuppet(data);

    try {
      return new OfficialInochiPuppetHandle(
        this.#bindings,
        puppetPointer,
      );
    } catch (error) {
      if (Number.isInteger(puppetPointer) && puppetPointer > 0) {
        this.#bindings.freePuppet(puppetPointer);
      }

      throw error;
    }
  }
}
