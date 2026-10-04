import * as z from 'zod';

export const InochiBlendModeSchema = z.enum([
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
]);

export type InochiBlendMode = z.infer<typeof InochiBlendModeSchema>;

export const InochiMaskModeSchema = z.enum(['mask', 'dodge']);
export type InochiMaskMode = z.infer<typeof InochiMaskModeSchema>;

export const InochiDrawStateSchema = z.enum([
  'normal',
  'define-mask',
  'push-mask',
  'pop-mask',
  'composite-begin',
  'composite-end',
  'composite-blit',
]);

export type InochiDrawState = z.infer<typeof InochiDrawStateSchema>;

export interface InochiTextureFrame {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  readonly channels: 1 | 2 | 3 | 4;
  readonly pixels: Uint8Array;
}

export interface InochiVertex {
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly v: number;
}

export interface InochiDrawCommand {
  readonly state: InochiDrawState;
  readonly blendMode: InochiBlendMode;
  readonly maskMode: InochiMaskMode;
  readonly sourceTextureIds: readonly (number | null)[];
  readonly allocationId: number;
  readonly vertexOffset: number;
  readonly indexOffset: number;
  readonly elementCount: number;
  readonly type: number;
  readonly variables: Uint8Array;
}

export interface InochiMeshAllocation {
  readonly vertexOffset: number;
  readonly indexOffset: number;
  readonly indexCount: number;
  readonly vertexCount: number;
  readonly allocationId: number;
}

export interface InochiDrawFrame {
  readonly vertices: readonly InochiVertex[];
  readonly indices: Uint32Array;
  readonly textures: readonly InochiTextureFrame[];
  readonly allocations: readonly InochiMeshAllocation[];
  readonly commands: readonly InochiDrawCommand[];
  readonly usesBaseVertex: boolean;
}

export interface InochiParameterDescriptor {
  readonly name: string;
  readonly lowerBounds: readonly number[];
  readonly upperBounds: readonly number[];
  readonly value: readonly number[];
  readonly active: boolean;
}

export interface InochiPuppetRuntimeHandle {
  readonly name: string;
  readonly author: string;
  listParameters(): readonly InochiParameterDescriptor[];
  setParameter(name: string, values: readonly number[]): void;
  update(deltaSeconds: number): void;
  renderFrame(deltaSeconds: number): InochiDrawFrame;
  dispose(): void;
}

export interface InochiRuntimePort {
  loadPuppet(data: ArrayBuffer): InochiPuppetRuntimeHandle;
}
