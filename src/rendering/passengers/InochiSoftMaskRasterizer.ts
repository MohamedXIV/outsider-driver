import {
  compileInochiRenderProgram,
  type InochiRenderProgram,
} from './InochiRenderProgram';
import type {
  InochiDrawCommand,
  InochiDrawFrame,
  InochiTextureFrame,
  InochiVertex,
} from './InochiRuntimeContracts';

export interface InochiMaskBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface InochiMaskSnapshot {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

export interface InochiSoftMaskResult {
  readonly bounds: InochiMaskBounds;
  readonly snapshots: readonly InochiMaskSnapshot[];
  readonly snapshotIndexByCommand: ReadonlyMap<number, number>;
}

interface MaskLayer {
  readonly id: number;
  readonly pixels: Float32Array;
  version: number;
}

type MaskBlend = 'add' | 'replace';

const DEFAULT_MASK_RESOLUTION = 256;
const EPSILON = 1e-6;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function requireTexture(
  textures: ReadonlyMap<number, InochiTextureFrame>,
  textureId: number,
): InochiTextureFrame {
  const texture = textures.get(textureId);

  if (texture === undefined) {
    throw new Error(
      `Inochi mask command references unavailable texture ${String(textureId)}.`,
    );
  }

  return texture;
}

function alphaAt(
  texture: InochiTextureFrame,
  pixelIndex: number,
): number {
  const source = pixelIndex * texture.channels;

  switch (texture.channels) {
    case 1:
      return (texture.pixels[source] ?? 0) / 255;
    case 2:
      return (texture.pixels[source + 1] ?? 0) / 255;
    case 3:
      return 1;
    case 4:
      return (texture.pixels[source + 3] ?? 0) / 255;
  }
}

function sampleAlpha(
  texture: InochiTextureFrame,
  uInput: number,
  vInput: number,
): number {
  const u = clamp01(uInput);
  const v = clamp01(vInput);
  const x = u * Math.max(0, texture.width - 1);
  const y = v * Math.max(0, texture.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(texture.width - 1, x0 + 1);
  const y1 = Math.min(texture.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;

  const a00 = alphaAt(texture, y0 * texture.width + x0);
  const a10 = alphaAt(texture, y0 * texture.width + x1);
  const a01 = alphaAt(texture, y1 * texture.width + x0);
  const a11 = alphaAt(texture, y1 * texture.width + x1);
  const top = a00 + (a10 - a00) * tx;
  const bottom = a01 + (a11 - a01) * tx;

  return top + (bottom - top) * ty;
}

function calculateBounds(
  vertices: readonly InochiVertex[],
): InochiMaskBounds {
  if (vertices.length === 0) {
    throw new Error(
      'Cannot build an Inochi soft mask without frame vertices.',
    );
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const vertex of vertices) {
    minX = Math.min(minX, vertex.x);
    minY = Math.min(minY, vertex.y);
    maxX = Math.max(maxX, vertex.x);
    maxY = Math.max(maxY, vertex.y);
  }

  if (maxX - minX <= EPSILON || maxY - minY <= EPSILON) {
    throw new Error(
      'Inochi soft-mask bounds must span a non-zero 2D area.',
    );
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

function maskPixelCoordinate(
  vertex: InochiVertex,
  bounds: InochiMaskBounds,
  resolution: number,
): readonly [number, number] {
  return [
    ((vertex.x - bounds.minX) / (bounds.maxX - bounds.minX)) *
      (resolution - 1),
    ((vertex.y - bounds.minY) / (bounds.maxY - bounds.minY)) *
      (resolution - 1),
  ];
}

function frameVertexIndex(
  frame: InochiDrawFrame,
  command: InochiDrawCommand,
  localIndex: number,
): number {
  return frame.usesBaseVertex
    ? localIndex + command.vertexOffset
    : localIndex;
}

function edgeValue(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): number {
  return (
    (bx - ax) * (py - ay) -
    (by - ay) * (px - ax)
  );
}

function isTopLeftEdge(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  const dy = by - ay;
  const dx = bx - ax;

  return dy > 0 || (Math.abs(dy) <= EPSILON && dx < 0);
}

function includesEdge(
  value: number,
  topLeft: boolean,
): boolean {
  return (
    value > EPSILON ||
    (Math.abs(value) <= EPSILON && topLeft)
  );
}

function rasterizeTriangle(
  target: Float32Array,
  resolution: number,
  bounds: InochiMaskBounds,
  texture: InochiTextureFrame,
  mode: InochiDrawCommand['maskMode'],
  blend: MaskBlend,
  aInput: InochiVertex,
  bInput: InochiVertex,
  cInput: InochiVertex,
): void {
  const a = aInput;
  let b = bInput;
  let c = cInput;
  const [ax, ay] = maskPixelCoordinate(
    a,
    bounds,
    resolution,
  );
  let [bx, by] = maskPixelCoordinate(
    b,
    bounds,
    resolution,
  );
  let [cx, cy] = maskPixelCoordinate(
    c,
    bounds,
    resolution,
  );
  let area = edgeValue(ax, ay, bx, by, cx, cy);

  if (Math.abs(area) <= EPSILON) {
    return;
  }

  if (area < 0) {
    [b, c] = [c, b];
    [bx, cx] = [cx, bx];
    [by, cy] = [cy, by];
    area = -area;
  }

  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxX = Math.min(
    resolution - 1,
    Math.ceil(Math.max(ax, bx, cx)),
  );
  const maxY = Math.min(
    resolution - 1,
    Math.ceil(Math.max(ay, by, cy)),
  );
  const edgeBCIsTopLeft = isTopLeftEdge(bx, by, cx, cy);
  const edgeCAIsTopLeft = isTopLeftEdge(cx, cy, ax, ay);
  const edgeABIsTopLeft = isTopLeftEdge(ax, ay, bx, by);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const sampleX = x + 0.5;
      const sampleY = y + 0.5;
      const edgeBC = edgeValue(
        bx,
        by,
        cx,
        cy,
        sampleX,
        sampleY,
      );
      const edgeCA = edgeValue(
        cx,
        cy,
        ax,
        ay,
        sampleX,
        sampleY,
      );
      const edgeAB = edgeValue(
        ax,
        ay,
        bx,
        by,
        sampleX,
        sampleY,
      );

      if (
        !includesEdge(edgeBC, edgeBCIsTopLeft) ||
        !includesEdge(edgeCA, edgeCAIsTopLeft) ||
        !includesEdge(edgeAB, edgeABIsTopLeft)
      ) {
        continue;
      }

      const w0 = edgeBC / area;
      const w1 = edgeCA / area;
      const w2 = edgeAB / area;
      const u = a.u * w0 + b.u * w1 + c.u * w2;
      const v = a.v * w0 + b.v * w1 + c.v * w2;
      const alpha = sampleAlpha(texture, u, v);
      const source =
        mode === 'mask' ? alpha : 1 - alpha;
      const targetIndex = y * resolution + x;

      if (blend === 'replace') {
        target[targetIndex] = source;
      } else {
        target[targetIndex] = clamp01(
          (target[targetIndex] ?? 0) + source,
        );
      }
    }
  }
}

function rasterizeMaskCommand(
  frame: InochiDrawFrame,
  command: InochiDrawCommand,
  textures: ReadonlyMap<number, InochiTextureFrame>,
  bounds: InochiMaskBounds,
  resolution: number,
  target: Float32Array,
  blend: MaskBlend,
): void {
  const textureId = command.sourceTextureIds[0];

  if (textureId === null || textureId === undefined) {
    return;
  }

  const texture = requireTexture(textures, textureId);
  const indices = frame.indices.slice(
    command.indexOffset,
    command.indexOffset + command.elementCount,
  );

  if (indices.length % 3 !== 0) {
    throw new Error(
      'Inochi mask draw command index count must be divisible by 3.',
    );
  }

  for (
    let indexOffset = 0;
    indexOffset < indices.length;
    indexOffset += 3
  ) {
    const localA = indices[indexOffset];
    const localB = indices[indexOffset + 1];
    const localC = indices[indexOffset + 2];

    if (
      localA === undefined ||
      localB === undefined ||
      localC === undefined
    ) {
      throw new Error('Inochi mask triangle is incomplete.');
    }

    const a = frame.vertices[
      frameVertexIndex(frame, command, localA)
    ];
    const b = frame.vertices[
      frameVertexIndex(frame, command, localB)
    ];
    const c = frame.vertices[
      frameVertexIndex(frame, command, localC)
    ];

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error(
        'Inochi mask command references a vertex outside the frame buffer.',
      );
    }

    rasterizeTriangle(
      target,
      resolution,
      bounds,
      texture,
      command.maskMode,
      blend,
      a,
      b,
      c,
    );
  }
}

function toMaskBytes(source: Float32Array): Uint8Array {
  const bytes = new Uint8Array(source.length);

  for (let index = 0; index < source.length; index += 1) {
    bytes[index] = Math.round(
      clamp01(source[index] ?? 0) * 255,
    );
  }

  return bytes;
}

export function createInochiMaskUvs(
  vertices: readonly InochiVertex[],
  bounds: InochiMaskBounds,
): readonly number[] {
  return vertices.flatMap((vertex) => [
    (vertex.x - bounds.minX) / (bounds.maxX - bounds.minX),
    (vertex.y - bounds.minY) / (bounds.maxY - bounds.minY),
  ]);
}

export function rasterizeInochiSoftMasks(
  frameInput: InochiDrawFrame,
  resolution = DEFAULT_MASK_RESOLUTION,
): InochiSoftMaskResult {
  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 2048) {
    throw new RangeError(
      'Inochi soft-mask resolution must be an integer from 8 to 2048.',
    );
  }

  const program: InochiRenderProgram =
    compileInochiRenderProgram(frameInput);
  const frame = program.frame;
  const bounds = calculateBounds(frame.vertices);
  const textures = new Map(
    frame.textures.map((texture) => [texture.id, texture]),
  );
  const layers: MaskLayer[] = [];
  const snapshots: InochiMaskSnapshot[] = [];
  const snapshotIndexByCommand = new Map<number, number>();
  const snapshotByLayerVersion = new Map<string, number>();
  let blend: MaskBlend = 'add';

  for (const operation of program.operations) {
    switch (operation.kind) {
      case 'push-mask': {
        let pixels: Float32Array;

        if (layers.length === 0) {
          pixels = new Float32Array(resolution * resolution);

          if (operation.mode === 'dodge') {
            pixels.fill(1);
            blend = 'replace';
          } else {
            blend = 'add';
          }
        } else {
          const parent = layers.at(-1);

          if (parent === undefined) {
            throw new Error(
              'Inochi mask stack lost its parent layer.',
            );
          }

          pixels = new Float32Array(parent.pixels);
        }

        layers.push({
          id: operation.layerId,
          pixels,
          version: 0,
        });
        break;
      }

      case 'define-mask': {
        const current = layers.at(-1);

        if (current?.id !== operation.layerId) {
          throw new Error(
            'Inochi define-mask operation does not match the active mask layer.',
          );
        }

        rasterizeMaskCommand(
          frame,
          operation.command,
          textures,
          bounds,
          resolution,
          current.pixels,
          blend,
        );
        current.version += 1;
        break;
      }

      case 'draw':
      case 'composite-blit': {
        const current = layers.at(-1);

        if (current === undefined) {
          break;
        }

        const cacheKey = `${String(current.id)}:${String(current.version)}`;
        let snapshotIndex = snapshotByLayerVersion.get(cacheKey);

        if (snapshotIndex === undefined) {
          snapshotIndex = snapshots.length;
          snapshots.push({
            width: resolution,
            height: resolution,
            pixels: toMaskBytes(current.pixels),
          });
          snapshotByLayerVersion.set(cacheKey, snapshotIndex);
        }

        snapshotIndexByCommand.set(
          operation.commandIndex,
          snapshotIndex,
        );
        break;
      }

      case 'pop-mask': {
        const current = layers.pop();

        if (current?.id !== operation.layerId) {
          throw new Error(
            'Inochi pop-mask operation does not match the active layer.',
          );
        }
        break;
      }

      case 'composite-begin':
      case 'composite-end':
        break;
    }
  }

  return {
    bounds,
    snapshots,
    snapshotIndexByCommand,
  };
}
