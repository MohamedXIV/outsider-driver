import { Constants } from '@babylonjs/core/Engines/constants';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import {
  NEUTRAL_PASSENGER_LIGHTING,
  PassengerLightingStateSchema,
  type PassengerLightingSink,
  type PassengerLightingState,
} from './PassengerLighting';
import {
  parseInochiPartVariables,
} from './InochiDrawVariables';
import {
  compileInochiRenderProgram,
  type InochiRenderOperation,
} from './InochiRenderProgram';
import {
  createInochiMaskUvs,
  rasterizeInochiSoftMasks,
  type InochiMaskSnapshot,
  type InochiSoftMaskResult,
} from './InochiSoftMaskRasterizer';
import type {
  InochiBlendMode,
  InochiDrawCommand,
  InochiDrawFrame,
  InochiTextureFrame,
} from './InochiRuntimeContracts';

export interface BabylonInochiPassengerRendererOptions {
  readonly pixelsPerSceneUnit?: number;
  readonly renderingGroupId?: number;
  readonly maskResolution?: number;
}

interface TextureEntry {
  readonly texture: RawTexture;
  readonly width: number;
  readonly height: number;
}

const INOCHI_VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
attribute vec2 uv2;

uniform mat4 worldViewProjection;

varying vec2 vUV;
varying vec2 vMaskUV;

void main(void) {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vUV = uv;
  vMaskUV = uv2;
}
`;

const INOCHI_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
varying vec2 vMaskUV;

uniform sampler2D albedoSampler;
uniform sampler2D emissiveSampler;
uniform sampler2D maskSampler;
uniform vec3 tint;
uniform vec3 screenTint;
uniform float opacity;
uniform float emissionStrength;
uniform float hasMask;

uniform vec3 passengerAmbientColor;
uniform float passengerAmbientIntensity;
uniform vec3 passengerKeyColor;
uniform float passengerKeyIntensity;
uniform vec3 passengerKeyDirection;
uniform vec3 passengerAccentColor;
uniform float passengerAccentIntensity;
uniform vec3 passengerAccentDirection;

vec4 inochiScreen(vec4 inColor, vec3 screenColor) {
  return vec4(
    vec3(1.0) - (
      (vec3(1.0) - inColor.rgb) *
      (vec3(1.0) - (screenColor * inColor.a))
    ),
    inColor.a
  );
}

float stylizedFacing(vec3 normal, vec3 direction) {
  return 0.25 + 0.75 * max(
    dot(normal, normalize(direction)),
    0.0
  );
}

void main(void) {
  float maskValue = mix(
    1.0,
    texture2D(maskSampler, vMaskUV).r,
    hasMask
  );
  vec4 inAlbedo =
    texture2D(albedoSampler, vUV) * opacity * maskValue;
  vec4 authored =
    inochiScreen(inAlbedo, screenTint) * vec4(tint, 1.0);

  // A deliberately gentle curved-paper normal: enough to place the
  // illustrated passenger in the cabin light without pretending the
  // puppet is a physically modelled 3D surface.
  vec3 paperNormal = normalize(vec3(
    (vUV.x - 0.5) * 0.30,
    (0.5 - vUV.y) * 0.12,
    1.0
  ));
  float keyFacing = stylizedFacing(
    paperNormal,
    passengerKeyDirection
  );
  float accentFacing = stylizedFacing(
    paperNormal,
    passengerAccentDirection
  );
  vec3 illumination =
    passengerAmbientColor * passengerAmbientIntensity +
    passengerKeyColor * passengerKeyIntensity * keyFacing +
    passengerAccentColor * passengerAccentIntensity * accentFacing;
  illumination = max(illumination, vec3(0.035));

  vec3 emissive =
    texture2D(emissiveSampler, vUV).rgb *
    emissionStrength *
    authored.a;

  gl_FragColor = vec4(
    authored.rgb * illumination + emissive,
    authored.a
  );
}
`;

function toRgba(texture: InochiTextureFrame): Uint8Array {
  const pixelCount = texture.width * texture.height;
  const expected = pixelCount * texture.channels;

  if (texture.pixels.byteLength !== expected) {
    throw new Error(
      `Inochi texture ${String(texture.id)} expected ${String(expected)} bytes, received ${String(texture.pixels.byteLength)}.`,
    );
  }

  if (texture.channels === 4) {
    return new Uint8Array(texture.pixels);
  }

  const rgba = new Uint8Array(pixelCount * 4);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const source = pixel * texture.channels;
    const target = pixel * 4;

    if (texture.channels === 3) {
      rgba[target] = texture.pixels[source] ?? 0;
      rgba[target + 1] = texture.pixels[source + 1] ?? 0;
      rgba[target + 2] = texture.pixels[source + 2] ?? 0;
      rgba[target + 3] = 255;
      continue;
    }

    const luminance = texture.pixels[source] ?? 0;
    rgba[target] = luminance;
    rgba[target + 1] = luminance;
    rgba[target + 2] = luminance;
    rgba[target + 3] =
      texture.channels === 2
        ? (texture.pixels[source + 1] ?? 0)
        : 255;
  }

  return rgba;
}

function maskSnapshotToRgba(
  snapshot: InochiMaskSnapshot,
): Uint8Array {
  const rgba = new Uint8Array(
    snapshot.width * snapshot.height * 4,
  );

  snapshot.pixels.forEach((value, index) => {
    const target = index * 4;
    rgba[target] = value;
    rgba[target + 1] = value;
    rgba[target + 2] = value;
    rgba[target + 3] = 255;
  });

  return rgba;
}

function alphaModeForBlendMode(mode: InochiBlendMode): number {
  switch (mode) {
    case 'normal':
      return Constants.ALPHA_PREMULTIPLIED_PORTERDUFF;
    case 'screen':
    case 'linear-dodge':
      return Constants.ALPHA_SCREENMODE;
    case 'multiply':
    case 'overlay':
    case 'darken':
    case 'lighten':
    case 'color-dodge':
    case 'add-glow':
    case 'color-burn':
    case 'hard-light':
    case 'soft-light':
    case 'difference':
    case 'exclusion':
    case 'subtract':
    case 'inverse':
    case 'destination-in':
    case 'source-in':
    case 'source-out':
      throw new Error(
        `Inochi blend mode is not yet represented exactly by the Babylon bridge: ${mode}`,
      );
  }
}

function requireSupportedDrawableTextures(
  command: InochiDrawCommand,
): void {
  for (
    let sourceIndex = 2;
    sourceIndex < command.sourceTextureIds.length;
    sourceIndex += 1
  ) {
    if (command.sourceTextureIds[sourceIndex] !== null) {
      const label =
        sourceIndex === 2 ? 'Bumpmap' : `attachment ${String(sourceIndex)}`;

      throw new Error(
        `Inochi ${label} is not represented exactly by the stylized passenger lighting bridge.`,
      );
    }
  }
}

function requireNoComposites(
  operations: readonly InochiRenderOperation[],
): void {
  const unsupported = operations.find(
    (operation) =>
      operation.kind === 'composite-begin' ||
      operation.kind === 'composite-end' ||
      operation.kind === 'composite-blit',
  );

  if (unsupported !== undefined) {
    throw new Error(
      `Inochi draw state requires the composite framebuffer backend: ${unsupported.kind}`,
    );
  }
}

export class BabylonInochiPassengerRenderer
  implements PassengerLightingSink
{
  readonly #scene: Scene;
  readonly #root: TransformNode;
  readonly #pixelsPerSceneUnit: number;
  readonly #renderingGroupId: number;
  readonly #maskResolution: number;
  readonly #textures = new Map<number, TextureEntry>();
  readonly #meshes: Mesh[] = [];
  readonly #materials: ShaderMaterial[] = [];
  readonly #maskTextures: RawTexture[] = [];
  readonly #whiteMaskTexture: RawTexture;
  readonly #blackEmissiveTexture: RawTexture;
  #lightingState: PassengerLightingState =
    NEUTRAL_PASSENGER_LIGHTING;
  #disposed = false;

  public constructor(
    scene: Scene,
    passengerSeat: TransformNode,
    options: BabylonInochiPassengerRendererOptions = {},
  ) {
    this.#scene = scene;
    this.#pixelsPerSceneUnit = options.pixelsPerSceneUnit ?? 600;
    this.#renderingGroupId = options.renderingGroupId ?? 2;
    this.#maskResolution = options.maskResolution ?? 256;

    if (
      !Number.isFinite(this.#pixelsPerSceneUnit) ||
      this.#pixelsPerSceneUnit <= 0
    ) {
      throw new RangeError(
        'Inochi pixelsPerSceneUnit must be a finite positive number.',
      );
    }

    if (
      !Number.isInteger(this.#maskResolution) ||
      this.#maskResolution < 8 ||
      this.#maskResolution > 2048
    ) {
      throw new RangeError(
        'Inochi maskResolution must be an integer from 8 to 2048.',
      );
    }

    this.#root = new TransformNode(
      'inochi-passenger-root',
      scene,
    );
    this.#root.parent = passengerSeat;

    this.#whiteMaskTexture = RawTexture.CreateRGBATexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      scene,
      false,
      false,
      Constants.TEXTURE_NEAREST_SAMPLINGMODE,
    );
    this.#whiteMaskTexture.name = 'inochi-white-mask';
    this.#whiteMaskTexture.wrapU =
      Constants.TEXTURE_CLAMP_ADDRESSMODE;
    this.#whiteMaskTexture.wrapV =
      Constants.TEXTURE_CLAMP_ADDRESSMODE;

    this.#blackEmissiveTexture = RawTexture.CreateRGBATexture(
      new Uint8Array([0, 0, 0, 255]),
      1,
      1,
      scene,
      false,
      false,
      Constants.TEXTURE_NEAREST_SAMPLINGMODE,
    );
    this.#blackEmissiveTexture.name = 'inochi-black-emissive';
    this.#blackEmissiveTexture.wrapU =
      Constants.TEXTURE_CLAMP_ADDRESSMODE;
    this.#blackEmissiveTexture.wrapV =
      Constants.TEXTURE_CLAMP_ADDRESSMODE;
  }

  public get root(): TransformNode {
    this.#assertAlive();
    return this.#root;
  }

  public setLighting(stateInput: PassengerLightingState): void {
    this.#assertAlive();
    this.#lightingState =
      PassengerLightingStateSchema.parse(stateInput);

    for (const material of this.#materials) {
      this.#applyLightingToMaterial(material);
    }
  }

  public getLightingState(): PassengerLightingState {
    this.#assertAlive();
    return PassengerLightingStateSchema.parse(
      this.#lightingState,
    );
  }

  public render(frameInput: InochiDrawFrame): void {
    this.#assertAlive();
    const program = compileInochiRenderProgram(frameInput);
    const frame = program.frame;

    requireNoComposites(program.operations);

    const drawOperations = program.operations.filter(
      (operation): operation is Extract<
        InochiRenderOperation,
        { readonly kind: 'draw' }
      > => operation.kind === 'draw',
    );

    for (const operation of drawOperations) {
      alphaModeForBlendMode(operation.command.blendMode);
      parseInochiPartVariables(operation.command);
      requireSupportedDrawableTextures(operation.command);
    }

    this.#clearMeshes();
    this.#syncTextures(frame.textures);

    const maskResult =
      program.maskLayerCount > 0
        ? rasterizeInochiSoftMasks(
            frame,
            this.#maskResolution,
          )
        : null;
    const maskUvs =
      maskResult === null
        ? frame.vertices.flatMap(() => [0, 0])
        : createInochiMaskUvs(
            frame.vertices,
            maskResult.bounds,
          );

    this.#syncMaskTextures(maskResult);

    const positions = frame.vertices.flatMap((vertex) => [
      vertex.x / this.#pixelsPerSceneUnit,
      -vertex.y / this.#pixelsPerSceneUnit,
      0,
    ]);
    const uvs = frame.vertices.flatMap((vertex) => [
      vertex.u,
      vertex.v,
    ]);

    for (const operation of drawOperations) {
      this.#renderDrawOperation(
        frame,
        operation,
        positions,
        uvs,
        maskUvs,
        maskResult,
      );
    }
  }

  public getCommandMeshes(): readonly Mesh[] {
    this.#assertAlive();
    return [...this.#meshes];
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#clearMeshes();

    for (const entry of this.#textures.values()) {
      entry.texture.dispose();
    }

    this.#textures.clear();
    this.#whiteMaskTexture.dispose();
    this.#blackEmissiveTexture.dispose();
    this.#root.dispose();
    this.#disposed = true;
  }

  #renderDrawOperation(
    frame: InochiDrawFrame,
    operation: Extract<
      InochiRenderOperation,
      { readonly kind: 'draw' }
    >,
    positions: readonly number[],
    uvs: readonly number[],
    maskUvs: readonly number[],
    maskResult: InochiSoftMaskResult | null,
  ): void {
    const command = operation.command;

    if (command.elementCount === 0) {
      return;
    }

    const sourceTextureId = command.sourceTextureIds[0];

    if (
      sourceTextureId === null ||
      sourceTextureId === undefined
    ) {
      throw new Error(
        `Inochi drawable command ${String(operation.commandIndex)} has no albedo texture in source slot 0.`,
      );
    }

    const texture = this.#textures.get(sourceTextureId);

    if (texture === undefined) {
      throw new Error(
        `Inochi drawable command references unavailable texture ${String(sourceTextureId)}.`,
      );
    }

    const emissiveTextureId = command.sourceTextureIds[1];
    const emissiveTexture =
      emissiveTextureId === null ||
      emissiveTextureId === undefined
        ? this.#blackEmissiveTexture
        : this.#textures.get(emissiveTextureId)?.texture;

    if (emissiveTexture === undefined) {
      throw new Error(
        `Inochi drawable command references unavailable emissive texture ${String(emissiveTextureId)}.`,
      );
    }

    const sourceIndices = frame.indices.slice(
      command.indexOffset,
      command.indexOffset + command.elementCount,
    );
    const indices = Array.from(sourceIndices, (index) =>
      frame.usesBaseVertex
        ? index + command.vertexOffset
        : index,
    );

    const mesh = new Mesh(
      `inochi-passenger-command-${String(operation.commandIndex)}`,
      this.#scene,
    );
    mesh.parent = this.#root;
    mesh.renderingGroupId = this.#renderingGroupId;
    mesh.alphaIndex = operation.commandIndex;
    mesh.isPickable = false;

    const vertexData = new VertexData();
    vertexData.positions = [...positions];
    vertexData.uvs = [...uvs];
    vertexData.uvs2 = [...maskUvs];
    vertexData.indices = indices;
    vertexData.applyToMesh(mesh, true);

    const variables = parseInochiPartVariables(command);
    const material = new ShaderMaterial(
      `inochi-passenger-material-${String(operation.commandIndex)}`,
      this.#scene,
      {
        vertexSource: INOCHI_VERTEX_SHADER,
        fragmentSource: INOCHI_FRAGMENT_SHADER,
      },
      {
        attributes: ['position', 'uv', 'uv2'],
        uniforms: [
          'worldViewProjection',
          'tint',
          'screenTint',
          'opacity',
          'emissionStrength',
          'hasMask',
          'passengerAmbientColor',
          'passengerAmbientIntensity',
          'passengerKeyColor',
          'passengerKeyIntensity',
          'passengerKeyDirection',
          'passengerAccentColor',
          'passengerAccentIntensity',
          'passengerAccentDirection',
        ],
        samplers: [
          'albedoSampler',
          'emissiveSampler',
          'maskSampler',
        ],
        needAlphaBlending: true,
      },
    );

    material.backFaceCulling = false;
    material.alphaMode = alphaModeForBlendMode(
      command.blendMode,
    );
    material.setTexture(
      'albedoSampler',
      texture.texture,
    );
    material.setTexture(
      'emissiveSampler',
      emissiveTexture,
    );
    material.setVector3(
      'tint',
      Vector3.FromArray(variables.tint),
    );
    material.setVector3(
      'screenTint',
      Vector3.FromArray(variables.screenTint),
    );
    material.setFloat('opacity', variables.opacity);
    material.setFloat(
      'emissionStrength',
      variables.emissionStrength,
    );
    this.#applyLightingToMaterial(material);

    const snapshotIndex =
      maskResult?.snapshotIndexByCommand.get(
        operation.commandIndex,
      );
    const maskTexture =
      snapshotIndex === undefined
        ? this.#whiteMaskTexture
        : this.#maskTextures[snapshotIndex];

    if (maskTexture === undefined) {
      throw new Error(
        `Inochi mask snapshot ${String(snapshotIndex)} is unavailable.`,
      );
    }

    material.setTexture('maskSampler', maskTexture);
    material.setFloat(
      'hasMask',
      snapshotIndex === undefined ? 0 : 1,
    );
    mesh.material = material;

    this.#meshes.push(mesh);
    this.#materials.push(material);
  }

  #applyLightingToMaterial(
    material: ShaderMaterial,
  ): void {
    const state = this.#lightingState;

    material.setVector3(
      'passengerAmbientColor',
      Vector3.FromArray(state.ambientColor),
    );
    material.setFloat(
      'passengerAmbientIntensity',
      state.ambientIntensity,
    );
    material.setVector3(
      'passengerKeyColor',
      Vector3.FromArray(state.keyColor),
    );
    material.setFloat(
      'passengerKeyIntensity',
      state.keyIntensity,
    );
    material.setVector3(
      'passengerKeyDirection',
      Vector3.FromArray(state.keyDirection),
    );
    material.setVector3(
      'passengerAccentColor',
      Vector3.FromArray(state.accentColor),
    );
    material.setFloat(
      'passengerAccentIntensity',
      state.accentIntensity,
    );
    material.setVector3(
      'passengerAccentDirection',
      Vector3.FromArray(state.accentDirection),
    );
  }

  #syncTextures(
    textures: readonly InochiTextureFrame[],
  ): void {
    const currentIds = new Set(
      textures.map((texture) => texture.id),
    );

    for (const [textureId, entry] of this.#textures) {
      if (!currentIds.has(textureId)) {
        entry.texture.dispose();
        this.#textures.delete(textureId);
      }
    }

    for (const source of textures) {
      const data = toRgba(source);
      const current = this.#textures.get(source.id);

      if (
        current?.width === source.width &&
        current.height === source.height
      ) {
        current.texture.update(data);
        continue;
      }

      current?.texture.dispose();

      const texture = RawTexture.CreateRGBATexture(
        data,
        source.width,
        source.height,
        this.#scene,
        false,
        false,
        Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
      );
      texture.name =
        `inochi-texture-${String(source.id)}`;
      texture.hasAlpha = true;
      texture.wrapU =
        Constants.TEXTURE_CLAMP_ADDRESSMODE;
      texture.wrapV =
        Constants.TEXTURE_CLAMP_ADDRESSMODE;

      this.#textures.set(source.id, {
        texture,
        width: source.width,
        height: source.height,
      });
    }
  }

  #syncMaskTextures(
    result: InochiSoftMaskResult | null,
  ): void {
    for (const texture of this.#maskTextures) {
      texture.dispose();
    }

    this.#maskTextures.length = 0;

    if (result === null) {
      return;
    }

    result.snapshots.forEach((snapshot, index) => {
      const texture = RawTexture.CreateRGBATexture(
        maskSnapshotToRgba(snapshot),
        snapshot.width,
        snapshot.height,
        this.#scene,
        false,
        false,
        Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
      );
      texture.name =
        `inochi-mask-snapshot-${String(index)}`;
      texture.wrapU =
        Constants.TEXTURE_CLAMP_ADDRESSMODE;
      texture.wrapV =
        Constants.TEXTURE_CLAMP_ADDRESSMODE;
      this.#maskTextures.push(texture);
    });
  }

  #clearMeshes(): void {
    for (const mesh of this.#meshes) {
      mesh.dispose(false, false);
    }

    for (const material of this.#materials) {
      material.dispose(false, false);
    }

    for (const maskTexture of this.#maskTextures) {
      maskTexture.dispose();
    }

    this.#meshes.length = 0;
    this.#materials.length = 0;
    this.#maskTextures.length = 0;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error(
        'Cannot use a disposed BabylonInochiPassengerRenderer.',
      );
    }
  }
}
