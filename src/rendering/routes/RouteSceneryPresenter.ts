import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import * as z from 'zod';
import {
  resolveRouteEnvironment,
  validateRouteExperienceCatalog,
  type RouteEnvironmentInput,
  type RouteExperienceCatalog,
  type RouteSegmentScenery,
} from '../../content/routes/RouteExperienceContracts';
import {
  validateWorldContentCatalog,
  type WorldContentCatalog,
} from '../../content/world/WorldContracts';
import type { DistrictId, RouteSegmentId } from '../../domain/ids/EntityId';
import type { TaxiSceneHandle } from '../taxi/createTaxiScene';

const ProgressSchema = z.number().min(0).max(1);

function vector3(tuple: readonly [number, number, number]): Vector3 {
  return new Vector3(tuple[0], tuple[1], tuple[2]);
}

function color3(tuple: readonly [number, number, number]): Color3 {
  return new Color3(tuple[0], tuple[1], tuple[2]);
}

function requireSegmentDistrict(
  segmentId: RouteSegmentId,
  world: WorldContentCatalog,
): DistrictId {
  const segment = world.routeSegments.find(
    (candidate) => candidate.id === segmentId,
  );

  if (segment === undefined) {
    throw new Error(`Unknown route segment: ${segmentId}`);
  }

  return segment.data.districtId;
}

function requireScenery(
  segmentId: RouteSegmentId,
  experience: RouteExperienceCatalog,
): RouteSegmentScenery {
  const scenery = experience.segmentScenery.find(
    (candidate) => candidate.segmentId === segmentId,
  );

  if (scenery === undefined) {
    throw new Error(`Missing route scenery for: ${segmentId}`);
  }

  return scenery;
}

export class RouteSceneryPresenter {
  readonly #taxi: TaxiSceneHandle;
  readonly #world: WorldContentCatalog;
  readonly #experience: RouteExperienceCatalog;
  readonly #sceneryRoot: TransformNode;
  readonly #meshes: Mesh[] = [];
  readonly #materials: StandardMaterial[] = [];
  #activeSegmentId: RouteSegmentId | null = null;
  #travelDistanceMeters = 0;
  #disposed = false;

  public constructor(
    taxi: TaxiSceneHandle,
    worldInput: unknown,
    experienceInput: unknown,
  ) {
    this.#taxi = taxi;
    this.#world = validateWorldContentCatalog(worldInput);
    this.#experience = validateRouteExperienceCatalog(
      experienceInput,
      this.#world,
    );
    this.#sceneryRoot = new TransformNode(
      'route-scenery-root',
      taxi.scene,
    );
    this.#sceneryRoot.parent = taxi.worldRoot;
  }

  public showSegment(
    segmentId: RouteSegmentId,
    environment: RouteEnvironmentInput,
  ): void {
    this.#assertAlive();
    this.#clearModules();

    const scenery = requireScenery(segmentId, this.#experience);
    this.#activeSegmentId = segmentId;
    this.#travelDistanceMeters = scenery.travelDistanceMeters;
    this.#sceneryRoot.position.setAll(0);

    for (const module of scenery.modules) {
      const mesh = MeshBuilder.CreateBox(
        `route-scenery-${module.id}`,
        {
          width: module.size[0],
          height: module.size[1],
          depth: module.size[2],
        },
        this.#taxi.scene,
      );
      mesh.parent = this.#sceneryRoot;
      mesh.position.copyFrom(vector3(module.position));

      const material = new StandardMaterial(
        `route-scenery-material-${module.id}`,
        this.#taxi.scene,
      );
      material.diffuseColor = color3(module.diffuseColor);
      material.emissiveColor = color3(module.emissiveColor);
      material.specularColor = Color3.Black();
      mesh.material = material;

      this.#meshes.push(mesh);
      this.#materials.push(material);
    }

    this.applyEnvironment(environment);
  }

  public setProgress(progressInput: number): void {
    this.#assertAlive();

    if (this.#activeSegmentId === null) {
      throw new Error('Cannot set scenery progress before showing a segment.');
    }

    const progress = ProgressSchema.parse(progressInput);
    this.#sceneryRoot.position.z =
      -progress * this.#travelDistanceMeters;
  }

  public applyEnvironment(environment: RouteEnvironmentInput): void {
    this.#assertAlive();

    if (this.#activeSegmentId === null) {
      throw new Error(
        'Cannot apply route environment before showing a segment.',
      );
    }

    const districtId = requireSegmentDistrict(
      this.#activeSegmentId,
      this.#world,
    );
    const profile = this.#experience.districtVisuals.find(
      (candidate) => candidate.districtId === districtId,
    );

    if (profile === undefined) {
      throw new Error(`Missing district visual profile: ${districtId}`);
    }

    const resolved = resolveRouteEnvironment(profile, environment);
    this.#taxi.scene.clearColor = new Color4(
      resolved.clearColor[0],
      resolved.clearColor[1],
      resolved.clearColor[2],
      1,
    );
    this.#taxi.ambientLight.diffuse = color3(resolved.ambientColor);
    this.#taxi.ambientLight.intensity = resolved.ambientIntensity;
    this.#taxi.scene.fogColor = color3(resolved.fogColor);
    this.#taxi.scene.fogDensity = resolved.fogDensity;
    this.#taxi.scene.fogMode =
      resolved.fogDensity > 0 ? Scene.FOGMODE_EXP2 : Scene.FOGMODE_NONE;
  }

  public getRoot(): TransformNode {
    return this.#sceneryRoot;
  }

  public getActiveSegmentId(): RouteSegmentId | null {
    return this.#activeSegmentId;
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#clearModules();
    this.#sceneryRoot.dispose();
    this.#activeSegmentId = null;
    this.#disposed = true;
  }

  #clearModules(): void {
    for (const mesh of this.#meshes) {
      mesh.dispose();
    }

    for (const material of this.#materials) {
      material.dispose();
    }

    this.#meshes.length = 0;
    this.#materials.length = 0;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('Cannot use a disposed RouteSceneryPresenter.');
    }
  }
}
