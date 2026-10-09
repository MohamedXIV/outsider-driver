import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { PassengerPerformanceControlPort } from '../../../app/ports/PassengerPerformancePort';
import type { SpriteEvaluationMode } from './SpritePassengerCandidate';

const ROOT = '/passengers/mint-elf/';
const WIDTH = 452;
const HEIGHT = 558;
const ART_HEIGHT = HEIGHT / WIDTH;
const headPivot = [230, 305] as const;
const antennaPivot = [271, 133] as const;
const centerPivot = [WIDTH / 2, HEIGHT / 2] as const;

type SourceName = 'portrait' | 'torso' | 'head' | 'antenna-right';
interface PieceDefinition {
  readonly source: SourceName;
  readonly maskAntenna: boolean;
  readonly pivot: readonly [number, number];
  readonly role: 'portrait' | 'torso' | 'head' | 'antenna';
}
interface PieceHandle {
  readonly node: TransformNode;
  readonly mesh: Mesh;
  readonly texture: DynamicTexture;
  readonly role: PieceDefinition['role'];
}

// Shared image/decode promises mean mode switching never triggers three
// independent downloads of the same original user-provided WebP art.
const sourceCache = new Map<SourceName, Promise<HTMLImageElement>>();
function sourceImage(name: SourceName): Promise<HTMLImageElement> {
  const cached = sourceCache.get(name);
  if (cached !== undefined) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { resolve(image); };
    image.onerror = () => { reject(new Error('Unable to load mint elf asset: ' + ROOT + name + '.webp')); };
    image.src = ROOT + name + '.webp';
  });
  sourceCache.set(name, promise);
  return promise;
}

function definitions(mode: SpriteEvaluationMode): readonly PieceDefinition[] {
  if (mode === 'spritesheet') {
    return [{ source: 'portrait', role: 'portrait', pivot: centerPivot, maskAntenna: false }];
  }
  if (mode === 'layered') {
    return [
      { source: 'torso', role: 'torso', pivot: centerPivot, maskAntenna: false },
      { source: 'head', role: 'head', pivot: headPivot, maskAntenna: true },
      { source: 'antenna-right', role: 'antenna', pivot: antennaPivot, maskAntenna: false },
    ];
  }
  return [
    { source: 'portrait', role: 'portrait', pivot: centerPivot, maskAntenna: true },
    { source: 'antenna-right', role: 'antenna', pivot: antennaPivot, maskAntenna: false },
  ];
}

function makePiece(
  scene: Scene,
  root: TransformNode,
  mode: SpriteEvaluationMode,
  definition: PieceDefinition,
  index: number,
): PieceHandle {
  const name = 'mint-elf-' + mode + '-' + definition.role;
  const pivotX = definition.pivot[0] / WIDTH - 0.5;
  const pivotY = 0.5 * ART_HEIGHT - definition.pivot[1] / WIDTH;
  const node = new TransformNode(name + '-pivot', scene);
  node.parent = root;
  node.position.set(pivotX, 0.64 + pivotY, -0.004 * index);

  const mesh = MeshBuilder.CreatePlane(name, {
    width: 1, height: ART_HEIGHT, sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  mesh.parent = node;
  mesh.position.set(-pivotX, -pivotY, 0);
  mesh.renderingGroupId = 1;
  mesh.alphaIndex = index;
  mesh.isPickable = false;

  const texture = new DynamicTexture(name + '-raster', {
    width: WIDTH, height: HEIGHT,
  }, scene, false, Texture.TRILINEAR_SAMPLINGMODE);
  texture.hasAlpha = true;
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const material = new StandardMaterial(name + '-material', scene);
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  material.specularColor = Color3.Black();
  mesh.material = material;
  return { node, mesh, texture, role: definition.role };
}

/**
 * The face has no separate pupils/lids/mouth in the original cutouts, so
 * facial controls are intentionally nonvisual. Unlike the comparison alien,
 * this renderer only animates channels supported by the source art.
 */
export class MintElfPassengerCandidate implements PassengerPerformanceControlPort {
  readonly root: TransformNode;
  readonly parts: readonly PieceHandle[];
  readonly ready: Promise<boolean>;
  status: 'loading' | 'ready' | 'failed' = 'loading';
  #elapsed = 0;
  #headX = 0;
  #headY = 0;
  #bodyX = 0;
  #bodyY = 0;
  #disposed = false;
  // Semantic cue values are accepted but cannot affect the current baked face.
  #facialIntent = { talk: 0, blink: 0, gazeX: 0, gazeY: 0, expression: 'neutral' };

  constructor(scene: Scene, seat: TransformNode, mode: SpriteEvaluationMode) {
    this.root = new TransformNode('mint-elf-' + mode, scene);
    this.root.parent = seat;
    const definitionsForMode = definitions(mode);
    this.parts = definitionsForMode.map((part, index) =>
      makePiece(scene, this.root, mode, part, index));
    this.ready = Promise.all(definitionsForMode.map(async (definition, index) => {
      const source = await sourceImage(definition.source);
      const mask = definition.maskAntenna ? await sourceImage('antenna-right') : null;
      if (this.#disposed) return;
      const texture = this.parts[index]?.texture;
      if (texture === undefined) return;
      const context = texture.getContext() as CanvasRenderingContext2D;
      context.clearRect(0, 0, WIDTH, HEIGHT);
      context.drawImage(source, 0, 0, WIDTH, HEIGHT);
      if (mask !== null) {
        // The right antenna is already painted onto the head/portrait.
        // Alpha-subtract the *exact uploaded cutout* before re-compositing
        // it as a movable layer, preventing double/ghost antennae.
        context.globalCompositeOperation = 'destination-out';
        context.drawImage(mask, 0, 0, WIDTH, HEIGHT);
        context.globalCompositeOperation = 'source-over';
      }
      texture.update();
    })).then(() => {
      if (!this.#disposed) this.status = 'ready';
      return true;
    }).catch(() => {
      if (!this.#disposed) this.status = 'failed';
      return false;
    });
  }

  /**
   * Experimental, independent of the cabin lights. Unlit preserves original
   * painted shading; the multiplier is applied to RGB without touching alpha.
   */
  public setSpriteLighting(unlit: boolean, brightness: number, tint: Color3 = Color3.White()): void {
    const gain = Math.max(0.25, Math.min(3, brightness));
    for (const piece of this.parts) {
      const material = piece.mesh.material;
      if (!(material instanceof StandardMaterial)) continue;
      material.disableLighting = unlit;
      // A StandardMaterial with lighting disabled has no diffuse light
      // contribution. The original painted RGBA must therefore be supplied
      // through emissiveTexture, retaining diffuseTexture for alpha blending.
      material.diffuseColor = unlit ? Color3.Black() : tint.scale(gain);
      material.emissiveTexture = unlit ? piece.texture : null;
      material.emissiveColor = unlit ? tint.scale(gain) : Color3.Black();
    }
  }

  public setTalk(amount: number): void { this.#facialIntent.talk = amount; }
  public setBlink(amount: number): void { this.#facialIntent.blink = amount; }
  public setGaze(x: number, y: number): void {
    this.#facialIntent.gazeX = x;
    this.#facialIntent.gazeY = y;
  }
  public setHeadPose(x: number, y: number): void {
    this.#headX = Math.max(-1, Math.min(1, x));
    this.#headY = Math.max(-1, Math.min(1, y));
  }
  public setBodyPose(x: number, y: number): void {
    this.#bodyX = Math.max(-1, Math.min(1, x));
    this.#bodyY = Math.max(-1, Math.min(1, y));
  }
  public setExpression(name: string | null): void {
    this.#facialIntent.expression = name ?? 'neutral';
  }
  public applyCue(name: string): void {
    switch (name) {
      case 'neutral': this.reset(); break;
      case 'guarded':
        this.setHeadPose(-0.12, 0.04);
        this.setBodyPose(-0.08, 0);
        break;
      case 'firm':
        this.setHeadPose(0.1, 0);
        this.setBodyPose(0, 0);
        break;
      case 'speaking': break;
      default: throw new RangeError('Unknown mint elf performance cue: ' + name);
    }
  }
  public reset(): void {
    this.#headX = 0;
    this.#headY = 0;
    this.#bodyX = 0;
    this.#bodyY = 0;
    this.#facialIntent = { talk: 0, blink: 0, gazeX: 0, gazeY: 0, expression: 'neutral' };
  }
  public update(deltaSeconds: number, motionIntensity: number): void {
    if (this.#disposed || this.status !== 'ready') return;
    const motion = Math.max(0, Math.min(1, motionIntensity));
    this.#elapsed += Math.max(0, Math.min(0.1, deltaSeconds));
    const sway = Math.sin(this.#elapsed * 1.4) * motion;
    this.root.rotation.z = this.#bodyX * 0.02 * motion;
    this.root.position.y = sway * 0.006;
    for (const part of this.parts) {
      part.node.rotation.z = part.role === 'head'
        ? this.#headX * 0.04 * motion
        : part.role === 'antenna'
          ? sway * 0.075
          : 0;
      part.node.position.y =
        0.64 + (0.5 * ART_HEIGHT - (
          part.role === 'head' ? headPivot[1] :
          part.role === 'antenna' ? antennaPivot[1] : centerPivot[1]
        ) / WIDTH) + (part.role === 'head' ? this.#headY * 0.013 * motion : this.#bodyY * 0.003 * motion);
    }
  }
  public metrics(): { meshes: number; atlasPixels: number; decodedTextureBytes: number } {
    const atlasPixels = WIDTH * HEIGHT * this.parts.length;
    return { meshes: this.parts.length, atlasPixels, decodedTextureBytes: atlasPixels * 4 };
  }
  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const part of this.parts) {
      const material = part.mesh.material;
      part.mesh.dispose();
      material?.dispose();
      part.texture.dispose();
      part.node.dispose();
    }
    this.root.dispose();
  }
}
