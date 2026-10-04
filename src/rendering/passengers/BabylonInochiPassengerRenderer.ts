import { Constants } from '@babylonjs/core/Engines/constants';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import {
  validateInochiDrawFrame,
} from './InochiWasmAbi';
import type {
  InochiBlendMode,
  InochiDrawCommand,
  InochiDrawFrame,
  InochiTextureFrame,
} from './InochiRuntimeContracts';

export interface BabylonInochiPassengerRendererOptions {
  readonly pixelsPerSceneUnit?: number;
  readonly renderingGroupId?: number;
}

interface TextureEntry {
  readonly texture: RawTexture;
  readonly width: number;
  readonly height: number;
}

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

function alphaModeForBlendMode(mode: InochiBlendMode): number {
  switch (mode) {
    case 'normal':
      return Constants.ALPHA_COMBINE;
    case 'multiply':
      return Constants.ALPHA_MULTIPLY;
    case 'screen':
      return Constants.ALPHA_SCREENMODE;
    case 'linear-dodge':
    case 'add-glow':
      return Constants.ALPHA_ADD;
    case 'subtract':
      return Constants.ALPHA_SUBTRACT;
    default:
      throw new Error(
        `Inochi blend mode is not yet represented exactly by the Babylon bridge: ${mode}`,
      );
  }
}

function requireDrawableCommand(command: InochiDrawCommand): void {
  if (command.state !== 'normal') {
    throw new Error(
      `Inochi draw state requires the mask/composite pass backend: ${command.state}`,
    );
  }
}

export class BabylonInochiPassengerRenderer {
  readonly #scene: Scene;
  readonly #root: TransformNode;
  readonly #pixelsPerSceneUnit: number;
  readonly #renderingGroupId: number;
  readonly #textures = new Map<number, TextureEntry>();
  readonly #meshes: Mesh[] = [];
  readonly #materials: StandardMaterial[] = [];
  #disposed = false;

  public constructor(
    scene: Scene,
    passengerSeat: TransformNode,
    options: BabylonInochiPassengerRendererOptions = {},
  ) {
    this.#scene = scene;
    this.#pixelsPerSceneUnit = options.pixelsPerSceneUnit ?? 600;
    this.#renderingGroupId = options.renderingGroupId ?? 2;

    if (
      !Number.isFinite(this.#pixelsPerSceneUnit) ||
      this.#pixelsPerSceneUnit <= 0
    ) {
      throw new RangeError(
        'Inochi pixelsPerSceneUnit must be a finite positive number.',
      );
    }

    this.#root = new TransformNode('inochi-passenger-root', scene);
    this.#root.parent = passengerSeat;
  }

  public get root(): TransformNode {
    this.#assertAlive();
    return this.#root;
  }

  public render(frameInput: InochiDrawFrame): void {
    this.#assertAlive();
    const frame = validateInochiDrawFrame(frameInput);

    for (const command of frame.commands) {
      requireDrawableCommand(command);
      alphaModeForBlendMode(command.blendMode);
    }

    this.#clearMeshes();
    this.#syncTextures(frame.textures);

    const positions = frame.vertices.flatMap((vertex) => [
      vertex.x / this.#pixelsPerSceneUnit,
      -vertex.y / this.#pixelsPerSceneUnit,
      0,
    ]);
    const uvs = frame.vertices.flatMap((vertex) => [
      vertex.u,
      vertex.v,
    ]);

    frame.commands.forEach((command, commandIndex) => {
      if (command.elementCount === 0) {
        return;
      }

      const sourceTextureId = command.sourceTextureIds[0];

      if (sourceTextureId === null) {
        throw new Error(
          `Inochi drawable command ${String(commandIndex)} has no albedo texture in source slot 0.`,
        );
      }

      const texture = this.#textures.get(sourceTextureId);

      if (texture === undefined) {
        throw new Error(
          `Inochi drawable command references unavailable texture ${String(sourceTextureId)}.`,
        );
      }

      const sourceIndices = frame.indices.slice(
        command.indexOffset,
        command.indexOffset + command.elementCount,
      );
      const indices = Array.from(sourceIndices, (index) =>
        frame.usesBaseVertex ? index + command.vertexOffset : index,
      );

      const mesh = new Mesh(
        `inochi-passenger-command-${String(commandIndex)}`,
        this.#scene,
      );
      mesh.parent = this.#root;
      mesh.renderingGroupId = this.#renderingGroupId;
      mesh.alphaIndex = commandIndex;
      mesh.isPickable = false;

      const vertexData = new VertexData();
      vertexData.positions = positions;
      vertexData.uvs = uvs;
      vertexData.indices = indices;
      vertexData.applyToMesh(mesh, true);

      const material = new StandardMaterial(
        `inochi-passenger-material-${String(commandIndex)}`,
        this.#scene,
      );
      material.disableLighting = true;
      material.backFaceCulling = false;
      material.specularColor = Color3.Black();
      material.emissiveColor = Color3.White();
      material.diffuseColor = Color3.White();
      material.diffuseTexture = texture.texture;
      texture.texture.hasAlpha = true;
      material.useAlphaFromDiffuseTexture = true;
      material.alphaMode = alphaModeForBlendMode(command.blendMode);
      mesh.material = material;

      this.#meshes.push(mesh);
      this.#materials.push(material);
    });
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
    this.#root.dispose();
    this.#disposed = true;
  }

  #syncTextures(textures: readonly InochiTextureFrame[]): void {
    const currentIds = new Set(textures.map((texture) => texture.id));

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
        current !== undefined &&
        current.width === source.width &&
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
      texture.name = `inochi-texture-${String(source.id)}`;
      texture.hasAlpha = true;

      this.#textures.set(source.id, {
        texture,
        width: source.width,
        height: source.height,
      });
    }
  }

  #clearMeshes(): void {
    for (const mesh of this.#meshes) {
      mesh.dispose(false, false);
    }

    for (const material of this.#materials) {
      material.dispose(false, false);
    }

    this.#meshes.length = 0;
    this.#materials.length = 0;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error(
        'Cannot use a disposed BabylonInochiPassengerRenderer.',
      );
    }
  }
}
