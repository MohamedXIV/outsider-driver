import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { Scene } from '@babylonjs/core/scene';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';

export type TaxiWorldStyle = 'default' | 'hybrid';
export interface HybridTaxiLookOptions {
  readonly style: TaxiWorldStyle;
  readonly steps: number;
  readonly ambientFloor: number;
  readonly bandSoftness: number;
  readonly rimIntensity: number;
}

export const DEFAULT_HYBRID_LOOK: HybridTaxiLookOptions = {
  style: 'default',
  steps: 3,
  ambientFloor: 0.22,
  bandSoftness: 0.15,
  rimIntensity: 0.12,
};

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
}

/**
 * A material-local, WebGL GLSL injection applied after StandardMaterial has
 * evaluated real Babylon lights (but before fog and scene image processing).
 * 
 * We estimate the light factor from final RGB / painted albedo, quantize
 * the illumination (not the original texture), then retain coloured lighting.
 * This avoids turning upholstery textures into three flat RGB colours.
 *
 * Only taxi opaque, non-emissive StandardMaterials receive the plugin; HUD
 * panels, windows, sprite art, and game systems remain untouched.
 */
class PainterlyCelMaterialPlugin extends MaterialPluginBase {
  options: HybridTaxiLookOptions = DEFAULT_HYBRID_LOOK;

  constructor(material: StandardMaterial) {
    super(material, 'TaxiPainterlyCel', 150);
    this._enable(true);
  }

  public getClassName(): string { return 'TaxiPainterlyCelMaterialPlugin'; }

  public isCompatible(language: ShaderLanguage): boolean {
    // Driver taxi currently uses Babylon's WebGL/GLSL path.
    return language === ShaderLanguage.GLSL;
  }

  public getUniforms(): { externalUniforms: string[] } {
    return { externalUniforms: ['uTaxiToonBands', 'uTaxiToonRim'] };
  }

  public bindForSubMesh(
    _uniformBuffer: UniformBuffer,
    _scene: Scene,
    _engine: AbstractEngine,
    subMesh: SubMesh,
  ): void {
    const effect = subMesh.effect;
    if (effect === null) return;
    const { style, steps, ambientFloor, bandSoftness, rimIntensity } = this.options;
    effect.setFloat4('uTaxiToonBands',
      style === 'hybrid' ? 1 : 0,
      clamp(Math.round(steps), 2, 4),
      clamp(ambientFloor, 0.04, 0.6),
      clamp(bandSoftness, 0, 0.45));
    effect.setFloat4('uTaxiToonRim',
      clamp(rimIntensity, 0, 0.5), 0.66, 0.79, 0.91);
  }

  public getCustomCode(shaderType: string): { [point: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
uniform vec4 uTaxiToonBands;
uniform vec4 uTaxiToonRim;
`,
      CUSTOM_FRAGMENT_BEFORE_FOG: `
if (uTaxiToonBands.x > 0.5) {
  vec3 taxiPaint = max(baseColor.rgb * diffuseColor, vec3(0.0));
  vec3 taxiOriginal = max(color.rgb, vec3(0.0));
  float taxiPaintLuma = dot(taxiPaint, vec3(0.2126, 0.7152, 0.0722));
  float taxiLitLuma = dot(taxiOriginal, vec3(0.2126, 0.7152, 0.0722));
  float taxiIllumination = taxiLitLuma / max(taxiPaintLuma, 0.025);
  float taxiN = max(1.0, uTaxiToonBands.y - 1.0);
  float taxiBounded = clamp(taxiIllumination, 0.0, 1.0);
  float taxiStepped = floor(taxiBounded * taxiN + 0.5) / taxiN;
  float taxiShade = mix(taxiStepped, taxiBounded, uTaxiToonBands.w);
  taxiShade = max(uTaxiToonBands.z, taxiShade);
  vec3 taxiTint = taxiOriginal / max(taxiLitLuma, 0.025);
  vec3 taxiCel = taxiPaint * taxiShade * max(taxiTint, vec3(0.12));
  // A gently raised ambient minimum keeps night-time painted surfaces visible.
  taxiCel = max(taxiCel, taxiPaint * uTaxiToonBands.z * 0.66);
  float taxiRim = pow(1.0 - clamp(dot(normalize(normalW),
    normalize(viewDirectionW)), 0.0, 1.0), 3.0);
  taxiCel += taxiPaint * uTaxiToonRim.yzw * taxiRim * uTaxiToonRim.x;
  color.rgb = taxiCel;
}
`,
    };
  }

  public deactivate(): void {
    this._enable(false);
  }
}

export interface TaxiHybridLookController {
  apply(options: HybridTaxiLookOptions): void;
  dispose(): void;
  readonly materialCount: number;
}

/**
 * Apply a reversible effect to the cabin and surrounding taxi scene's existing
 * shared materials; it is not part of serialized presentation/game state.
 */
export function createTaxiHybridLook(scene: Scene): TaxiHybridLookController {
  const plugins: PainterlyCelMaterialPlugin[] = [];
  for (const material of scene.materials) {
    if (!material.name.startsWith('taxi-material-')) continue;
    const surface = material as StandardMaterial;
    if (surface.disableLighting ||
      surface.emissiveTexture !== null ||
      surface.emissiveColor.maxComponent() > 0.06) {
      continue;
    }
    plugins.push(new PainterlyCelMaterialPlugin(surface));
  }
  let disposed = false;
  return {
    materialCount: plugins.length,
    apply(options): void {
      if (disposed) return;
      for (const plugin of plugins) plugin.options = options;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const plugin of plugins) plugin.deactivate();
    },
  };
}

/** Tint applied only to passenger diffuse output (not to the taxi lights). */
export function taxiSpriteTint(
  influence: number,
  cabinColor: Color3,
  neonColor: Color3,
  neonWeight: number,
): Color3 {
  const n = clamp(neonWeight, 0, 1);
  const source = Color3.Lerp(cabinColor, neonColor, n);
  const maximum = Math.max(0.01, source.maxComponent());
  // Chromatic tint only: normalise maximum channel so the slider does not
  // silently become another brightness control.
  source.scaleInPlace(1 / maximum);
  const strength = clamp(influence, 0, 1) * 0.42;
  return Color3.Lerp(Color3.White(), source, strength);
}
