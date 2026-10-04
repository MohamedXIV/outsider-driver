import type {
  InochiBlendMode,
  InochiDrawCommand,
  InochiDrawFrame,
  InochiDrawState,
  InochiMaskMode,
  InochiMeshAllocation,
  InochiVertex,
} from './InochiRuntimeContracts';

export const INOCHI_WASM_POINTER_BYTES = 4 as const;
export const INOCHI_MAX_ATTACHMENTS = 8 as const;
export const INOCHI_VERTEX_BYTES = 16 as const;
export const INOCHI_INDEX_BYTES = 4 as const;
export const INOCHI_DRAW_COMMAND_BYTES = 128 as const;
export const INOCHI_DRAW_ALLOCATION_BYTES = 20 as const;

const DRAW_STATE: readonly InochiDrawState[] = [
  'normal',
  'define-mask',
  'push-mask',
  'pop-mask',
  'composite-begin',
  'composite-end',
  'composite-blit',
];

const BLEND_MODE: readonly InochiBlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'linear-dodge',
  'add-glow',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'subtract',
  'inverse',
  'destination-in',
  'source-in',
  'source-out',
];

const MASK_MODE: readonly InochiMaskMode[] = ['mask', 'dodge'];

function requireEnumValue<T>(
  values: readonly T[],
  index: number,
  label: string,
): T {
  const value = values[index];

  if (value === undefined) {
    throw new Error(`Unsupported Inochi ${label} value: ${String(index)}`);
  }

  return value;
}

export function parseInochiVertices(
  memory: ArrayBuffer,
  byteOffset: number,
  byteLength: number,
): readonly InochiVertex[] {
  if (byteLength % INOCHI_VERTEX_BYTES !== 0) {
    throw new Error(
      `Inochi vertex buffer byte length must be divisible by ${String(INOCHI_VERTEX_BYTES)}.`,
    );
  }

  const view = new DataView(memory, byteOffset, byteLength);
  const vertices: InochiVertex[] = [];

  for (let offset = 0; offset < byteLength; offset += INOCHI_VERTEX_BYTES) {
    vertices.push({
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      u: view.getFloat32(offset + 8, true),
      v: view.getFloat32(offset + 12, true),
    });
  }

  return vertices;
}

export function parseInochiIndices(
  memory: ArrayBuffer,
  byteOffset: number,
  byteLength: number,
): Uint32Array {
  if (byteLength % INOCHI_INDEX_BYTES !== 0) {
    throw new Error(
      `Inochi index buffer byte length must be divisible by ${String(INOCHI_INDEX_BYTES)}.`,
    );
  }

  const view = new DataView(memory, byteOffset, byteLength);
  const result = new Uint32Array(byteLength / INOCHI_INDEX_BYTES);

  for (let index = 0; index < result.length; index += 1) {
    result[index] = view.getUint32(index * INOCHI_INDEX_BYTES, true);
  }

  return result;
}

export function parseInochiDrawCommands(
  memory: ArrayBuffer,
  byteOffset: number,
  count: number,
): readonly InochiDrawCommand[] {
  const view = new DataView(
    memory,
    byteOffset,
    count * INOCHI_DRAW_COMMAND_BYTES,
  );
  const commands: InochiDrawCommand[] = [];

  for (let commandIndex = 0; commandIndex < count; commandIndex += 1) {
    const base = commandIndex * INOCHI_DRAW_COMMAND_BYTES;
    const sources = Array.from(
      { length: INOCHI_MAX_ATTACHMENTS },
      (_, attachmentIndex) => {
        const pointer = view.getUint32(
          base + attachmentIndex * INOCHI_WASM_POINTER_BYTES,
          true,
        );
        return pointer === 0 ? null : pointer;
      },
    );

    const stateOffset =
      base + INOCHI_MAX_ATTACHMENTS * INOCHI_WASM_POINTER_BYTES;
    const variablesOffset = stateOffset + 8 * 4;

    commands.push({
      sourceTextureIds: sources,
      state: requireEnumValue(
        DRAW_STATE,
        view.getUint32(stateOffset, true),
        'draw state',
      ),
      blendMode: requireEnumValue(
        BLEND_MODE,
        view.getUint32(stateOffset + 4, true),
        'blend mode',
      ),
      maskMode: requireEnumValue(
        MASK_MODE,
        view.getUint32(stateOffset + 8, true),
        'mask mode',
      ),
      allocationId: view.getUint32(stateOffset + 12, true),
      vertexOffset: view.getUint32(stateOffset + 16, true),
      indexOffset: view.getUint32(stateOffset + 20, true),
      elementCount: view.getUint32(stateOffset + 24, true),
      type: view.getUint32(stateOffset + 28, true),
      variables: new Uint8Array(
        memory.slice(
          byteOffset + variablesOffset,
          byteOffset + variablesOffset + 64,
        ),
      ),
    });
  }

  return commands;
}

export function parseInochiAllocations(
  memory: ArrayBuffer,
  byteOffset: number,
  count: number,
): readonly InochiMeshAllocation[] {
  const view = new DataView(
    memory,
    byteOffset,
    count * INOCHI_DRAW_ALLOCATION_BYTES,
  );
  const allocations: InochiMeshAllocation[] = [];

  for (let index = 0; index < count; index += 1) {
    const base = index * INOCHI_DRAW_ALLOCATION_BYTES;
    allocations.push({
      vertexOffset: view.getUint32(base, true),
      indexOffset: view.getUint32(base + 4, true),
      indexCount: view.getUint32(base + 8, true),
      vertexCount: view.getUint32(base + 12, true),
      allocationId: view.getUint32(base + 16, true),
    });
  }

  return allocations;
}

export function validateInochiDrawFrame(
  frame: InochiDrawFrame,
): InochiDrawFrame {
  const textureIds = new Set(frame.textures.map((texture) => texture.id));
  const allocationIds = new Set(
    frame.allocations.map((allocation) => allocation.allocationId),
  );

  for (const command of frame.commands) {
    if (!allocationIds.has(command.allocationId)) {
      throw new Error(
        `Inochi draw command references unknown allocation ${String(command.allocationId)}.`,
      );
    }

    for (const textureId of command.sourceTextureIds) {
      if (textureId !== null && !textureIds.has(textureId)) {
        throw new Error(
          `Inochi draw command references unknown texture ${String(textureId)}.`,
        );
      }
    }

    if (command.indexOffset + command.elementCount > frame.indices.length) {
      throw new Error('Inochi draw command exceeds the frame index buffer.');
    }
  }

  return frame;
}
