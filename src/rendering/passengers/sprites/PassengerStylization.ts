import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { drawAlienLayer, neutralPose, PORTRAIT_HEIGHT, PORTRAIT_WIDTH } from './AlienPortraitArt';

export type PassengerArtSource = 'demo-alien' | 'mint-elf';

const sourceCanvasCache = new Map<PassengerArtSource, Promise<HTMLCanvasElement>>();
function sourceCanvas(art: PassengerArtSource): Promise<HTMLCanvasElement> {
  const cached = sourceCanvasCache.get(art);
  if (cached !== undefined) return cached;
  const promise = new Promise<HTMLCanvasElement>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    if (art === 'demo-alien') {
      canvas.width = PORTRAIT_WIDTH;
      canvas.height = PORTRAIT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx === null) { reject(new Error('Canvas 2D unavailable')); return; }
      drawAlienLayer(ctx, 'all', neutralPose());
      resolve(canvas);
      return;
    }
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx === null) { reject(new Error('Canvas 2D unavailable')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => { reject(new Error('Mint elf outline source failed to load')); };
    img.src = '/passengers/mint-elf/portrait.webp';
  });
  sourceCanvasCache.set(art, promise);
  return promise;
}

function gradientTexture(scene: Scene, name: string): DynamicTexture {
  const texture = new DynamicTexture(name, { width: 128, height: 128 }, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 9, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(255,255,255,0.78)');
  gradient.addColorStop(0.37, 'rgba(255,255,255,0.41)');
  gradient.addColorStop(0.78, 'rgba(255,255,255,0.10)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function alphaMaterial(scene: Scene, name: string, texture: DynamicTexture, color: Color3): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.emissiveTexture = texture;
  material.emissiveColor = color;
  material.disableLighting = true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  material.specularColor = Color3.Black();
  return material;
}

export function silhouetteOutlineOffsets(radius: number, samples = 20): readonly (readonly [number, number])[] {
  const size = Math.max(0, Math.min(5, radius));
  return Array.from({ length: samples }, (_, index) => {
    const angle = 2 * Math.PI * index / samples;
    return [Math.cos(angle) * size, Math.sin(angle) * size] as const;
  });
}

export function groundingShadowAlphas(opacity: number): readonly [number, number] {
  const o = Math.max(0, Math.min(0.85, opacity));
  return [o * 0.82, o * 0.60];
}

/**
 * Fully reversible *art-direction* props, not real cast shadows:
 * soft cushion contact and backrest grounding plus one shared silhouette
 * ink outline. The outline is derived once from real portrait alpha rather
 * than outlining internal head/torso seams.
 */
export class PassengerStylization {
  readonly #shadowPlanes: Mesh[] = [];
  readonly #shadowMaterials: StandardMaterial[] = [];
  readonly #shadowTexture: DynamicTexture;
  readonly #outline: Mesh;
  readonly #outlineMaterial: StandardMaterial;
  readonly #outlineTexture: DynamicTexture;
  #thickness = 0;
  #strength = 0;
  #request = 0;
  #disposed = false;

  constructor(scene: Scene, seat: TransformNode) {
    this.#shadowTexture = gradientTexture(scene, 'passenger-contact-shadow-gradient');
    const cushion = MeshBuilder.CreatePlane('passenger-contact-shadow-seat', {
      width: 0.62, height: 0.51, sideOrientation: Mesh.DOUBLESIDE,
    }, scene);
    cushion.parent = seat;
    cushion.position.set(0, 0.035, 0);
    cushion.rotation.x = Math.PI / 2;
    cushion.isPickable = false;
    const backrest = MeshBuilder.CreatePlane('passenger-contact-shadow-back', {
      width: 0.80, height: 0.76, sideOrientation: Mesh.DOUBLESIDE,
    }, scene);
    backrest.parent = seat;
    backrest.position.set(0, 0.49, 0.365);
    backrest.isPickable = false;
    for (const [index, mesh] of [cushion, backrest].entries()) {
      const material = alphaMaterial(scene, 'passenger-shadow-ink-' + String(index),
        this.#shadowTexture, new Color3(0.17, 0.14, 0.14));
      material.alpha = 0;
      mesh.material = material;
      mesh.renderingGroupId = 0;
      mesh.alphaIndex = -10 + index;
      this.#shadowPlanes.push(mesh);
      this.#shadowMaterials.push(material);
      mesh.setEnabled(false);
    }

    this.#outlineTexture = new DynamicTexture('passenger-art-ink-outline',
      { width: 512, height: 640 }, scene, false, Texture.TRILINEAR_SAMPLINGMODE);
    this.#outlineTexture.hasAlpha = true;
    this.#outlineMaterial = alphaMaterial(scene, 'passenger-silhouette-ink',
      this.#outlineTexture, new Color3(0.22, 0.17, 0.16));
    this.#outline = MeshBuilder.CreatePlane('passenger-ink-outline-plane',
      { width: 1, height: 640 / 512, sideOrientation: Mesh.DOUBLESIDE }, scene);
    this.#outline.material = this.#outlineMaterial;
    this.#outline.position.set(0, 0.64, 0.013);
    this.#outline.renderingGroupId = 1;
    this.#outline.alphaIndex = -100;
    this.#outline.isPickable = false;
    this.#outline.setEnabled(false);
  }

  public setShadow(opacity: number): void {
    const levels = groundingShadowAlphas(opacity);
    for (const [index, material] of this.#shadowMaterials.entries()) {
      material.alpha = levels[index] ?? 0;
    }
    for (const mesh of this.#shadowPlanes) mesh.setEnabled(levels[0] > 0);
  }

  public setOutline(root: TransformNode | null, art: PassengerArtSource,
    thickness: number, opacity: number): void {
    this.#thickness = Math.max(0, Math.min(5, Math.round(thickness)));
    this.#strength = Math.max(0, Math.min(1, opacity));
    this.#outline.parent = root;
    this.#outline.setEnabled(root !== null && this.#thickness > 0 && this.#strength > 0);
    this.#outlineMaterial.alpha = this.#strength;
    // Also invalidate an old asynchronous source decode when ink is turned off.
    const request = ++this.#request;
    if (!this.#outline.isEnabled()) return;
    void sourceCanvas(art).then(source => {
      if (this.#disposed || request !== this.#request) return;
      const ctx = this.#outlineTexture.getContext() as CanvasRenderingContext2D;
      const w = this.#outlineTexture.getSize().width;
      const h = this.#outlineTexture.getSize().height;
      const scale = Math.min((w - 20) / source.width, (h - 20) / source.height);
      const drawnW = source.width * scale;
      const drawnH = source.height * scale;
      const x = (w - drawnW) / 2;
      const y = (h - drawnH) / 2;
      ctx.clearRect(0, 0, w, h);
      // Eighteen neighbouring copies yield a continuous, camera-independent
      // outline. It is rendered ONLY once per art/slider change, not per frame.
      for (const [dx, dy] of silhouetteOutlineOffsets(this.#thickness)) {
        ctx.drawImage(source, x + dx * scale, y + dy * scale, drawnW, drawnH);
      }
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(source, x, y, drawnW, drawnH);
      ctx.globalCompositeOperation = 'source-over';
      this.#outlineTexture.update();
      // The outline plane matches the baked portrait dimensions including
      // its transparent margin, but sits behind all character animation planes.
      const worldW = art === 'demo-alien' ? 0.98 : 1;
      const worldH = art === 'demo-alien' ? 1.225 : 558 / 452;
      this.#outline.scaling.set(worldW * (w / drawnW),
        worldH * (h / drawnH), 1);
    }).catch(() => { if (!this.#disposed) this.#outline.setEnabled(false); });
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    ++this.#request;
    this.#outline.dispose();
    this.#outlineMaterial.dispose();
    this.#outlineTexture.dispose();
    for (const mesh of this.#shadowPlanes) mesh.dispose();
    for (const material of this.#shadowMaterials) material.dispose();
    this.#shadowTexture.dispose();
  }
}
