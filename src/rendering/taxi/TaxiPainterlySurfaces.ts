import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

/**
 * Reversible authored texture replacement for Passenger Lab ONLY.
 * This is a surface-treatment study, not a change to serialized scene data.
 */
export interface TaxiPainterlySurfaces {
  readonly materialCount: number;
  setPainted(painted: boolean): void;
  dispose(): void;
}

export function createTaxiPainterlySurfaces(scene: Scene): TaxiPainterlySurfaces {
  const originals: { material: StandardMaterial; texture: Texture; replacement: 'paint' | 'upholstery' }[] = [];
  for (const material of scene.materials) {
    if (!(material instanceof StandardMaterial)) continue;
    if (!material.name.startsWith('taxi-material-') ||
        !(material.diffuseTexture instanceof Texture) ||
        material.disableLighting) continue;
    const url = material.diffuseTexture.name;
    const replacement = url.endsWith('/taxi/paint.svg') ? 'paint' :
      url.endsWith('/taxi/upholstery.svg') ? 'upholstery' : null;
    if (replacement !== null) {
      originals.push({ material, texture: material.diffuseTexture, replacement });
    }
  }

  let disposed = false;
  let painted = false;
  const created = new Map<'paint' | 'upholstery', Texture>();
  function replacementTexture(kind: 'paint' | 'upholstery'): Texture {
    let texture = created.get(kind);
    if (texture !== undefined) return texture;
    texture = new Texture('/taxi/lab-painterly-' + (kind === 'paint' ? 'paint' : 'upholstery') +
      '.svg', scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    created.set(kind, texture);
    return texture;
  }

  return {
    materialCount: originals.length,
    setPainted(value): void {
      if (disposed || value === painted) return;
      painted = value;
      for (const entry of originals) {
        entry.material.diffuseTexture = painted
          ? replacementTexture(entry.replacement)
          : entry.texture;
      }
    },
    dispose(): void {
      if (disposed) return;
      this.setPainted(false);
      disposed = true;
      for (const texture of created.values()) texture.dispose();
      created.clear();
    },
  };
}
