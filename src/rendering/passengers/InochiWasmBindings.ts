import type { OfficialInochiBindings } from './OfficialInochiRuntimeAdapter';

interface InochiWasmExports extends WebAssembly.Exports {
  readonly memory: WebAssembly.Memory;
  in_init(): void;
  nu_malloc(size: number): number;
  nu_realloc(pointer: number, size: number): number;
  nu_free(pointer: number): void;

  in_puppet_load_from_memory(
    dataPointer: number,
    length: number,
    sinkPointer: number,
  ): number;
  in_puppet_free(puppetPointer: number): void;
  in_puppet_get_name(puppetPointer: number): number;
  in_puppet_get_author(puppetPointer: number): number;
  in_puppet_update(
    puppetPointer: number,
    deltaSeconds: number,
  ): void;
  in_puppet_draw(
    puppetPointer: number,
    deltaSeconds: number,
  ): void;
  in_puppet_get_drawlist(puppetPointer: number): number;
  in_puppet_get_texture_cache(puppetPointer: number): number;
  in_puppet_get_parameters(
    puppetPointer: number,
    countPointer: number,
  ): number;

  in_parameter_get_name(parameterPointer: number): number;
  in_parameter_get_active(parameterPointer: number): boolean;
  in_parameter_get_dimensions(parameterPointer: number): number;
  in_parameter_get_lower_bounds(parameterPointer: number): number;
  in_parameter_get_upper_bounds(parameterPointer: number): number;
  in_parameter_get_value(parameterPointer: number): number;
  in_parameter_set_value(
    parameterPointer: number,
    valuesPointer: number,
  ): void;

  in_texture_cache_get_textures(
    textureCachePointer: number,
    countPointer: number,
  ): number;
  in_texture_get_width(texturePointer: number): number;
  in_texture_get_height(texturePointer: number): number;
  in_texture_get_channels(texturePointer: number): number;
  in_texture_get_pixels(texturePointer: number): number;

  in_drawlist_get_use_base_vertex(drawListPointer: number): boolean;
  in_drawlist_get_commands(
    drawListPointer: number,
    countPointer: number,
  ): number;
  in_drawlist_get_vertex_data(
    drawListPointer: number,
    byteCountPointer: number,
  ): number;
  in_drawlist_get_index_data(
    drawListPointer: number,
    byteCountPointer: number,
  ): number;
  in_drawlist_get_allocations(
    drawListPointer: number,
    countPointer: number,
  ): number;
}

const WASM_START_SECTION_ID = 8;

function readUnsignedLeb128(
  bytes: Uint8Array,
  startOffset: number,
): { readonly value: number; readonly nextOffset: number } {
  let value = 0;
  let shift = 0;
  let offset = startOffset;

  while (offset < bytes.length) {
    const byte = bytes[offset];

    if (byte === undefined) {
      break;
    }

    value |= (byte & 0x7f) << shift;
    offset += 1;

    if ((byte & 0x80) === 0) {
      return {
        value,
        nextOffset: offset,
      };
    }

    shift += 7;

    if (shift > 28) {
      throw new Error('WASM section size LEB128 is too large.');
    }
  }

  throw new Error('Unexpected end of WASM while reading section size.');
}

export function hasWasmStartSection(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);

  if (
    bytes.length < 8 ||
    bytes[0] !== 0x00 ||
    bytes[1] !== 0x61 ||
    bytes[2] !== 0x73 ||
    bytes[3] !== 0x6d ||
    bytes[4] !== 0x01 ||
    bytes[5] !== 0x00 ||
    bytes[6] !== 0x00 ||
    bytes[7] !== 0x00
  ) {
    throw new Error('Invalid WebAssembly module header.');
  }

  let offset = 8;

  while (offset < bytes.length) {
    const sectionId = bytes[offset];

    if (sectionId === undefined) {
      break;
    }

    offset += 1;
    const size = readUnsignedLeb128(bytes, offset);
    offset = size.nextOffset;

    if (sectionId === WASM_START_SECTION_ID) {
      return true;
    }

    offset += size.value;

    if (offset > bytes.length) {
      throw new Error('WASM section extends beyond module bytes.');
    }
  }

  return false;
}

function createWasiImports(): WebAssembly.Imports {
  return {
    env: {
      STACKTOP: 0,
      STACK_MAX: 65_536,
      abortStackOverflow: () => {
        throw new Error('Inochi2D WASM stack overflow.');
      },
      memory: new WebAssembly.Memory({
        initial: 256,
      }),
      table: new WebAssembly.Table({
        initial: 0,
        element: 'anyfunc',
      }),
      memoryBase: 0,
      tableBase: 2_147_483_648,
    },
    wasi_snapshot_preview1: {
      args_get: () => 0,
      args_sizes_get: () => 0,
      path_open: () => 0,
      fd_close: () => 0,
      fd_seek: () => 0,
      fd_read: () => 0,
      fd_write: () => 0,
      fd_fdstat_get: () => 0,
      fd_fdstat_set_flags: () => 0,
      fd_prestat_get: () => 0,
      fd_prestat_dir_name: () => 0,
      proc_exit: (code: number) => {
        throw new Error(
          `Inochi2D WASM requested process exit ${String(code)}.`,
        );
      },
    },
  };
}

function requireHttpOk(response: Response, url: string): Response {
  if (!response.ok) {
    throw new Error(
      `Failed to load Inochi2D WASM from ${url}: HTTP ${String(response.status)}.`,
    );
  }

  return response;
}

export class InochiWasmBindings
  implements OfficialInochiBindings
{
  readonly #exports: InochiWasmExports;
  #countPointer = 0;
  #disposed = false;

  private constructor(exports: InochiWasmExports) {
    this.#exports = exports;
    this.#getCountPointer();
  }

  public static async create(
    runtimeUrl = '/vendor/inochi2d/inochi2d.wasm',
  ): Promise<InochiWasmBindings> {
    const response = requireHttpOk(
      await fetch(runtimeUrl),
      runtimeUrl,
    );
    const bytes = await response.arrayBuffer();
    const instantiated = await WebAssembly.instantiate(
      bytes,
      createWasiImports(),
    );
    const exports = instantiated.instance
      .exports as unknown as InochiWasmExports;

    if (
      !(exports.memory instanceof WebAssembly.Memory) ||
      typeof exports.in_init !== 'function' ||
      typeof exports.in_puppet_load_from_memory !== 'function'
    ) {
      throw new Error(
        'Loaded WASM does not expose the expected Inochi2D C API.',
      );
    }

    // A WASM Start section has already executed before instantiate()
    // returns. Re-running in_init() would execute the module constructors
    // twice and can corrupt allocator/global state. Keep the explicit call
    // only for compatible modules that do not carry a Start section.
    if (!hasWasmStartSection(bytes)) {
      exports.in_init();
    }

    return new InochiWasmBindings(exports);
  }

  public loadPuppet(data: ArrayBuffer): number {
    this.#assertAlive();

    if (data.byteLength === 0) {
      throw new Error('Inochi2D puppet asset must not be empty.');
    }

    const memoryBytesBefore = this.#exports.memory.buffer.byteLength;
    const dataPointer = this.#exports.nu_malloc(data.byteLength);

    if (dataPointer === 0) {
      const memoryBytesAfter = this.#exports.memory.buffer.byteLength;
      throw new Error(
        [
          `Inochi2D could not allocate ${String(data.byteLength)} bytes for a puppet asset using the official heap allocator.`,
          `WASM memory bytes before malloc: ${String(memoryBytesBefore)}.`,
          `WASM memory bytes after malloc: ${String(memoryBytesAfter)}.`,
        ].join(' '),
      );
    }

    try {
      new Uint8Array(
        this.#exports.memory.buffer,
        dataPointer,
        data.byteLength,
      ).set(new Uint8Array(data));

      return this.#exports.in_puppet_load_from_memory(
        dataPointer,
        data.byteLength,
        0,
      );
    } finally {
      this.#exports.nu_free(dataPointer);
    }
  }

  public freePuppet(puppetPointer: number): void {
    this.#assertAlive();
    this.#exports.in_puppet_free(puppetPointer);
  }

  public getPuppetName(puppetPointer: number): string {
    this.#assertAlive();
    return this.#readString(
      this.#exports.in_puppet_get_name(puppetPointer),
    );
  }

  public getPuppetAuthor(puppetPointer: number): string {
    this.#assertAlive();
    return this.#readString(
      this.#exports.in_puppet_get_author(puppetPointer),
    );
  }

  public updatePuppet(
    puppetPointer: number,
    deltaSeconds: number,
  ): void {
    this.#assertAlive();
    this.#exports.in_puppet_update(
      puppetPointer,
      deltaSeconds,
    );
  }

  public drawPuppet(
    puppetPointer: number,
    deltaSeconds: number,
  ): void {
    this.#assertAlive();
    this.#exports.in_puppet_draw(
      puppetPointer,
      deltaSeconds,
    );
  }

  public getDrawList(puppetPointer: number): number {
    this.#assertAlive();
    return this.#exports.in_puppet_get_drawlist(puppetPointer);
  }

  public getTextureCache(puppetPointer: number): number {
    this.#assertAlive();
    return this.#exports.in_puppet_get_texture_cache(
      puppetPointer,
    );
  }

  public getParameterPointers(
    puppetPointer: number,
  ): readonly number[] {
    this.#assertAlive();
    const pointer = this.#exports.in_puppet_get_parameters(
      puppetPointer,
      this.#getCountPointer(),
    );
    return this.#readPointerArray(
      pointer,
      this.#readCount(),
    );
  }

  public getParameterName(parameterPointer: number): string {
    this.#assertAlive();
    return this.#readString(
      this.#exports.in_parameter_get_name(parameterPointer),
    );
  }

  public getParameterActive(parameterPointer: number): boolean {
    this.#assertAlive();
    return this.#exports.in_parameter_get_active(
      parameterPointer,
    );
  }

  public getParameterLowerBounds(
    parameterPointer: number,
  ): readonly number[] {
    this.#assertAlive();
    return this.#readFloatArray(
      this.#exports.in_parameter_get_lower_bounds(
        parameterPointer,
      ),
      this.#parameterDimensions(parameterPointer),
    );
  }

  public getParameterUpperBounds(
    parameterPointer: number,
  ): readonly number[] {
    this.#assertAlive();
    return this.#readFloatArray(
      this.#exports.in_parameter_get_upper_bounds(
        parameterPointer,
      ),
      this.#parameterDimensions(parameterPointer),
    );
  }

  public getParameterValue(
    parameterPointer: number,
  ): readonly number[] {
    this.#assertAlive();
    return this.#readFloatArray(
      this.#exports.in_parameter_get_value(parameterPointer),
      this.#parameterDimensions(parameterPointer),
    );
  }

  public setParameterValue(
    parameterPointer: number,
    values: readonly number[],
  ): void {
    this.#assertAlive();
    const dimensions = this.#parameterDimensions(
      parameterPointer,
    );

    if (values.length !== dimensions) {
      throw new Error(
        `Inochi parameter expects ${String(dimensions)} dimensions, received ${String(values.length)}.`,
      );
    }

    const valuesPointer = this.#getCountPointer();
    const view = new DataView(
      this.#exports.memory.buffer,
      valuesPointer,
      dimensions * 4,
    );

    values.forEach((value, index) => {
      view.setFloat32(index * 4, value, true);
    });

    this.#exports.in_parameter_set_value(
      parameterPointer,
      valuesPointer,
    );
  }

  public getTexturePointers(
    textureCachePointer: number,
  ): readonly number[] {
    this.#assertAlive();
    const pointer =
      this.#exports.in_texture_cache_get_textures(
        textureCachePointer,
        this.#getCountPointer(),
      );
    return this.#readPointerArray(
      pointer,
      this.#readCount(),
    );
  }

  public getTextureWidth(texturePointer: number): number {
    this.#assertAlive();
    return this.#exports.in_texture_get_width(texturePointer);
  }

  public getTextureHeight(texturePointer: number): number {
    this.#assertAlive();
    return this.#exports.in_texture_get_height(texturePointer);
  }

  public getTextureChannels(texturePointer: number): number {
    this.#assertAlive();
    return this.#exports.in_texture_get_channels(texturePointer);
  }

  public getTexturePixelsPointer(texturePointer: number): number {
    this.#assertAlive();
    return this.#exports.in_texture_get_pixels(texturePointer);
  }

  public getDrawListUseBaseVertex(
    drawListPointer: number,
  ): boolean {
    this.#assertAlive();
    return this.#exports.in_drawlist_get_use_base_vertex(
      drawListPointer,
    );
  }

  public getDrawCommands(
    drawListPointer: number,
  ): { readonly pointer: number; readonly count: number } {
    this.#assertAlive();
    const pointer = this.#exports.in_drawlist_get_commands(
      drawListPointer,
      this.#getCountPointer(),
    );
    return {
      pointer,
      count: this.#readCount(),
    };
  }

  public getDrawVertices(
    drawListPointer: number,
  ): { readonly pointer: number; readonly bytes: number } {
    this.#assertAlive();
    const pointer =
      this.#exports.in_drawlist_get_vertex_data(
        drawListPointer,
        this.#getCountPointer(),
      );
    return {
      pointer,
      bytes: this.#readCount(),
    };
  }

  public getDrawIndices(
    drawListPointer: number,
  ): { readonly pointer: number; readonly bytes: number } {
    this.#assertAlive();
    const pointer =
      this.#exports.in_drawlist_get_index_data(
        drawListPointer,
        this.#getCountPointer(),
      );
    return {
      pointer,
      bytes: this.#readCount(),
    };
  }

  public getDrawAllocations(
    drawListPointer: number,
  ): { readonly pointer: number; readonly count: number } {
    this.#assertAlive();
    const pointer =
      this.#exports.in_drawlist_get_allocations(
        drawListPointer,
        this.#getCountPointer(),
      );
    return {
      pointer,
      count: this.#readCount(),
    };
  }

  public getMemoryBuffer(): ArrayBuffer {
    this.#assertAlive();
    return this.#exports.memory.buffer;
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    if (this.#countPointer !== 0) {
      this.#exports.nu_free(this.#countPointer);
      this.#countPointer = 0;
    }

    this.#disposed = true;
  }

  #parameterDimensions(parameterPointer: number): number {
    const dimensions =
      this.#exports.in_parameter_get_dimensions(
        parameterPointer,
      );

    if (
      !Number.isInteger(dimensions) ||
      dimensions < 1 ||
      dimensions > 4
    ) {
      throw new Error(
        `Unsupported Inochi parameter dimensionality: ${String(dimensions)}`,
      );
    }

    return dimensions;
  }

  #getCountPointer(): number {
    if (this.#countPointer !== 0) {
      return this.#countPointer;
    }

    const pointer = this.#exports.nu_realloc(0, 128);

    if (pointer === 0) {
      throw new Error(
        'Inochi2D WASM failed to allocate the 128-byte query scratchpad.',
      );
    }

    this.#countPointer = pointer;
    return pointer;
  }

  #readCount(): number {
    return new DataView(
      this.#exports.memory.buffer,
      this.#getCountPointer(),
      4,
    ).getUint32(0, true);
  }

  #readPointerArray(
    pointer: number,
    count: number,
  ): readonly number[] {
    if (count === 0) {
      return [];
    }

    if (pointer === 0) {
      throw new Error(
        'Inochi2D returned a null pointer for a non-empty pointer array.',
      );
    }

    const view = new DataView(
      this.#exports.memory.buffer,
      pointer,
      count * 4,
    );
    return Array.from(
      { length: count },
      (_, index) => view.getUint32(index * 4, true),
    );
  }

  #readFloatArray(
    pointer: number,
    count: number,
  ): readonly number[] {
    if (pointer === 0) {
      throw new Error(
        'Inochi2D returned a null pointer for parameter values.',
      );
    }

    const view = new DataView(
      this.#exports.memory.buffer,
      pointer,
      count * 4,
    );
    return Array.from(
      { length: count },
      (_, index) => view.getFloat32(index * 4, true),
    );
  }

  #readString(pointer: number): string {
    if (pointer === 0) {
      return '';
    }

    const bytes = new Uint8Array(
      this.#exports.memory.buffer,
      pointer,
    );
    const end = bytes.indexOf(0);

    if (end === -1) {
      throw new Error(
        'Inochi2D returned a non-terminated UTF-8 string.',
      );
    }

    return new TextDecoder().decode(bytes.subarray(0, end));
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error(
        'Cannot use disposed InochiWasmBindings.',
      );
    }
  }
}
