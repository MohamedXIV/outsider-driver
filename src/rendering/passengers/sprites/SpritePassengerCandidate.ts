import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { PassengerPerformanceControlPort } from '../../../app/ports/PassengerPerformancePort';
import {
  ALIEN_EXPRESSIONS,
  drawAlienLayer,
  neutralPose,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
  type AlienExpression,
  type AlienLayer,
  type AlienPose,
} from './AlienPortraitArt';

export type SpriteEvaluationMode = 'spritesheet' | 'layered' | 'hybrid';
export const SPRITE_MODES: readonly SpriteEvaluationMode[] = ['spritesheet', 'layered', 'hybrid'];

interface SpriteLayer {
  readonly mesh: Mesh;
  readonly atlas: DynamicTexture;
  readonly columns: number;
  readonly rows: number;
  readonly role: 'sheet' | 'body' | 'head' | 'antennae' | 'eyes' | 'mouth' | 'base';
  lastFrame: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, Number.isFinite(value) ? value : 0));

function makeAtlas(
  scene: Scene,
  name: string,
  layer: AlienLayer,
  columns: number,
  rows: number,
  poseFor: (column: number, row: number) => AlienPose,
): DynamicTexture {
  const texture = new DynamicTexture(
    name,
    { width: PORTRAIT_WIDTH * columns, height: PORTRAIT_HEIGHT * rows },
    scene,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  texture.hasAlpha = true;
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, PORTRAIT_WIDTH * columns, PORTRAIT_HEIGHT * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      ctx.save();
      ctx.translate(column * PORTRAIT_WIDTH, row * PORTRAIT_HEIGHT);
      drawAlienLayer(ctx, layer, poseFor(column, row));
      ctx.restore();
    }
  }
  texture.update();
  return texture;
}

function createLayer(
  scene: Scene,
  root: TransformNode,
  mode: SpriteEvaluationMode,
  role: SpriteLayer['role'],
  layer: AlienLayer,
  columns: number,
  rows: number,
  depth: number,
  poseFor: (column: number, row: number) => AlienPose,
): SpriteLayer {
  const name = `sprite-${mode}-${role}`;
  const atlas = makeAtlas(scene, `${name}-atlas`, layer, columns, rows, poseFor);
  const mesh = MeshBuilder.CreatePlane(
    name,
    { width: 0.98, height: 1.225, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  mesh.parent = root;
  mesh.position.set(0, 0.63, -0.004 * depth);
  mesh.renderingGroupId = 1;
  mesh.alphaIndex = depth;
  mesh.isPickable = false;
  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseTexture = atlas;
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.specularColor = Color3.Black();
  material.emissiveColor = new Color3(0.10, 0.10, 0.10);
  mesh.material = material;
  return { mesh, atlas, columns, rows, role, lastFrame: -1 };
}

function frameFor(layer: SpriteLayer, column: number, row: number): void {
  const index = row * layer.columns + column;
  if (layer.lastFrame === index) return;
  layer.atlas.uScale = 1 / layer.columns;
  layer.atlas.vScale = 1 / layer.rows;
  layer.atlas.uOffset = column / layer.columns;
  layer.atlas.vOffset = (layer.rows - 1 - row) / layer.rows;
  layer.lastFrame = index;
}

export class SpritePassengerCandidate implements PassengerPerformanceControlPort {
  readonly mode: SpriteEvaluationMode;
  readonly root: TransformNode;
  readonly layers: readonly SpriteLayer[];
  #talk = 0;
  #blink = 0;
  #gazeX = 0;
  #gazeY = 0;
  #headX = 0;
  #headY = 0;
  #bodyX = 0;
  #bodyY = 0;
  #expression: AlienExpression = 'neutral';
  #clock = 0;
  #disposed = false;

  public constructor(scene: Scene, seat: TransformNode, mode: SpriteEvaluationMode) {
    this.mode = mode;
    this.root = new TransformNode(`passenger-sprite-${mode}`, scene);
    this.root.parent = seat;
    const pose = neutralPose();
    const expressionPose = (row: number): AlienPose => ({
      ...pose,
      expression: ALIEN_EXPRESSIONS[row] ?? 'neutral',
    });
    if (mode === 'spritesheet') {
      this.layers = [createLayer(scene, this.root, mode, 'sheet', 'all', 4, 4, 0,
        (column, row) => ({
          ...expressionPose(row),
          talk: column === 1 ? 0.5 : column === 2 ? 1 : 0,
          blink: column === 3 ? 1 : 0,
        }))];
    } else {
      const layers: SpriteLayer[] = [];
      if (mode === 'layered') {
        layers.push(createLayer(scene, this.root, mode, 'body', 'body', 1, 1, 0, () => pose));
        layers.push(createLayer(scene, this.root, mode, 'head', 'head', 1, 1, 1, () => pose));
        layers.push(createLayer(scene, this.root, mode, 'antennae', 'antennae', 1, 1, 2, () => pose));
      } else {
        layers.push(createLayer(scene, this.root, mode, 'base', 'base', 4, 1, 0,
          (column) => ({ ...pose, sway: (column - 1.5) / 3 })));
      }
      layers.push(createLayer(scene, this.root, mode, 'eyes', 'eyes', 4, 4, 3,
        (column, row) => ({
          ...expressionPose(row),
          blink: column === 3 ? 1 : 0,
          gazeX: column === 1 ? -1 : column === 2 ? 1 : 0,
        })));
      layers.push(createLayer(scene, this.root, mode, 'mouth', 'mouth', 3, 4, 4,
        (column, row) => ({
          ...expressionPose(row),
          talk: column === 1 ? 0.55 : column === 2 ? 1 : 0,
        })));
      this.layers = layers;
    }
    this.update(0, 1);
  }

  public setSpriteLighting(unlit: boolean, brightness: number, tint: Color3 = Color3.White()): void {
    const gain = clamp(brightness, 0.25, 3);
    for (const layer of this.layers) {
      const material = layer.mesh.material;
      if (!(material instanceof StandardMaterial)) continue;
      material.disableLighting = unlit;
      material.diffuseColor = tint.scale(gain);
      material.emissiveColor = unlit
        ? Color3.Black()
        : new Color3(0.10 * gain, 0.10 * gain, 0.10 * gain);
    }
  }

  public setTalk(amount: number): void { this.#talk = clamp(amount, 0, 1); }
  public setBlink(amount: number): void { this.#blink = clamp(amount, 0, 1); }
  public setGaze(x: number, y: number): void {
    this.#gazeX = clamp(x, -1, 1);
    this.#gazeY = clamp(y, -1, 1);
  }
  public setHeadPose(x: number, y: number): void {
    this.#headX = clamp(x, -1, 1);
    this.#headY = clamp(y, -1, 1);
  }
  public setBodyPose(x: number, y: number): void {
    this.#bodyX = clamp(x, -1, 1);
    this.#bodyY = clamp(y, -1, 1);
  }
  public setExpression(name: string | null): void {
    if (name !== null && !ALIEN_EXPRESSIONS.some(expression => expression === name)) {
      throw new RangeError(`Unsupported sprite expression: ${name}`);
    }
    this.#expression = name === null ? 'neutral' : name as AlienExpression;
  }
  public applyCue(name: string): void {
    switch (name) {
      case 'guarded':
        this.setExpression('guarded');
        this.setGaze(-0.25, 0.05);
        this.setHeadPose(-0.12, 0.04);
        this.setBodyPose(-0.08, 0);
        this.setTalk(0.2);
        break;
      case 'firm':
        this.setExpression('firm');
        this.setGaze(0, 0);
        this.setHeadPose(0.1, 0);
        this.setBodyPose(0, 0);
        this.setTalk(0.4);
        break;
      case 'speaking':
        this.setTalk(0.8);
        break;
      case 'neutral':
        this.reset();
        break;
      default:
        throw new RangeError(`Unknown sprite performance cue: ${name}`);
    }
  }
  public reset(): void {
    this.#talk = 0;
    this.#blink = 0;
    this.#gazeX = 0;
    this.#gazeY = 0;
    this.#headX = 0;
    this.#headY = 0;
    this.#bodyX = 0;
    this.#bodyY = 0;
    this.#expression = 'neutral';
  }
  public update(deltaSeconds: number, motionIntensity: number): void {
    if (this.#disposed) return;
    const motion = clamp(motionIntensity, 0, 1);
    this.#clock += clamp(deltaSeconds, 0, 0.1);
    const sway = Math.sin(this.#clock * 1.5) * motion;
    const speaking = this.#talk > 0.25 &&
      Math.sin(this.#clock * 13) > -0.25 ? this.#talk : 0;
    const automaticBlink = motion > 0 && this.#clock % 4.7 < 0.14 ? 1 : 0;
    const blink = Math.max(this.#blink, automaticBlink);
    const row = ALIEN_EXPRESSIONS.indexOf(this.#expression);
    this.root.position.y = 0.012 * sway;
    this.root.rotation.z = this.#bodyX * 0.035 * motion;
    for (const layer of this.layers) {
      if (layer.role === 'sheet') {
        // The packed-sheet candidate only has authored facial frame combinations.
        frameFor(layer, blink > 0.5 ? 3 : speaking > 0.65 ? 2 : speaking > 0 ? 1 : 0, row);
      } else if (layer.role === 'base') {
        frameFor(layer, Math.min(3, Math.max(0, Math.floor((sway + 1) * 2))), 0);
      } else if (layer.role === 'eyes') {
        const col = blink > 0.5 ? 3 : this.#gazeX < -0.3 ? 1 : this.#gazeX > 0.3 ? 2 : 0;
        frameFor(layer, col, row);
        layer.mesh.position.y = 0.63 + (this.#headY + this.#gazeY * 0.25) * 0.018 * motion;
        layer.mesh.position.x = this.#headX * 0.02 * motion;
      } else if (layer.role === 'mouth') {
        frameFor(layer, speaking > 0.65 ? 2 : speaking > 0.25 ? 1 : 0, row);
        layer.mesh.position.y = 0.63 + this.#headY * 0.018 * motion;
        layer.mesh.position.x = this.#headX * 0.02 * motion;
      } else {
        frameFor(layer, 0, 0);
        if (layer.role !== 'body') {
          layer.mesh.position.x = this.#headX * 0.02 * motion;
          layer.mesh.position.y = 0.63 + this.#headY * 0.018 * motion;
          layer.mesh.rotation.z = this.#headX * 0.025 * motion;
          if (layer.role === 'antennae') layer.mesh.rotation.z += sway * 0.025;
        } else {
          layer.mesh.rotation.z = this.#bodyX * 0.012 * motion;
          layer.mesh.position.y = 0.63 + this.#bodyY * 0.014 * motion;
        }
      }
    }
  }
  public metrics(): { meshes: number; atlasPixels: number; decodedTextureBytes: number } {
    const atlasPixels = this.layers.reduce((sum, layer) =>
      sum + PORTRAIT_WIDTH * PORTRAIT_HEIGHT * layer.columns * layer.rows, 0);
    return { meshes: this.layers.length, atlasPixels, decodedTextureBytes: atlasPixels * 4 };
  }
  public dispose(): void {
    if (this.#disposed) return;
    for (const layer of this.layers) {
      const material = layer.mesh.material;
      layer.mesh.dispose();
      material?.dispose();
      layer.atlas.dispose();
    }
    this.root.dispose();
    this.#disposed = true;
  }
}
