import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh, MeshBuilder } from '@babylonjs/core/Meshes';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { PassengerPerformanceControlPort } from '../../../app/ports/PassengerPerformancePort';
import type { SpriteEvaluationMode } from './SpritePassengerCandidate';

const ASSET_ROOT = '/passengers/mint-elf/';
const HEIGHT = 558 / 452;
export class MintElfPassengerCandidate implements PassengerPerformanceControlPort {
  readonly root: TransformNode;
  readonly parts: { mesh: Mesh; texture: Texture }[] = [];
  headX = 0;
  bodyX = 0;
  elapsed = 0;
  constructor(scene: Scene, seat: TransformNode, mode: SpriteEvaluationMode) {
    this.root = new TransformNode('mint-elf-' + mode, scene);
    this.root.parent = seat;
    const names = mode === 'layered' ? ['torso', 'head', 'antenna-right'] :
      mode === 'hybrid' ? ['portrait', 'antenna-right'] : ['portrait'];
    names.forEach((name, index) => {
      const mesh = MeshBuilder.CreatePlane('mint-elf-' + name, { width: 1, height: HEIGHT, sideOrientation: Mesh.DOUBLESIDE }, scene);
      mesh.parent = this.root;
      mesh.position.set(0, 0.64, -index * 0.004);
      mesh.alphaIndex = index;
      mesh.renderingGroupId = 1;
      const texture = new Texture(ASSET_ROOT + name + '.webp', scene);
      texture.hasAlpha = true;
      const material = new StandardMaterial('mint-elf-' + name, scene);
      material.diffuseTexture = texture;
      material.useAlphaFromDiffuseTexture = true;
      material.specularColor = Color3.Black();
      material.disableDepthWrite = true;
      material.backFaceCulling = false;
      mesh.material = material;
      this.parts.push({ mesh, texture });
    });
  }
  setTalk(_value: number): void {}
  setBlink(_value: number): void {}
  setGaze(_x: number, _y: number): void {}
  setHeadPose(x: number, _y: number): void { this.headX = x; }
  setBodyPose(x: number, _y: number): void { this.bodyX = x; }
  setExpression(_name: string | null): void {}
  applyCue(name: string): void {
    if (name === 'neutral') this.reset();
    if (name === 'guarded') { this.headX = -0.12; this.bodyX = -0.08; }
    if (name === 'firm') { this.headX = 0.1; this.bodyX = 0; }
  }
  reset(): void { this.headX = 0; this.bodyX = 0; }
  update(dt: number, intensity: number): void {
    this.elapsed += Math.max(0, Math.min(dt, 0.1));
    const motion = Math.max(0, Math.min(intensity, 1));
    this.root.rotation.z = this.bodyX * 0.02 * motion;
    this.root.position.y = Math.sin(this.elapsed * 1.4) * 0.006 * motion;
    for (const part of this.parts) {
      if (part.mesh.name === 'mint-elf-head') part.mesh.rotation.z = this.headX * 0.025 * motion;
      if (part.mesh.name === 'mint-elf-antenna-right') part.mesh.rotation.z = Math.sin(this.elapsed * 1.4) * 0.055 * motion;
    }
  }
  metrics(): { meshes: number; atlasPixels: number; decodedTextureBytes: number } {
    const atlasPixels = 452 * 558 * this.parts.length;
    return { meshes: this.parts.length, atlasPixels, decodedTextureBytes: atlasPixels * 4 };
  }
  dispose(): void {
    for (const part of this.parts) {
      part.mesh.material?.dispose();
      part.mesh.dispose();
      part.texture.dispose();
    }
    this.root.dispose();
  }
}