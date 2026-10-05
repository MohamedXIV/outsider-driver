import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Scene } from '@babylonjs/core/scene';
import {
  PersonalSpaceDefinitionSchema,
  type PersonalSpaceDefinition,
  type PersonalSpaceInteractionKind,
} from '../../content/spaces/PersonalSpaceContracts';
import { applyLocalTransform } from '../taxi/applyLocalTransform';

export type PersonalSpaceFlagResolver = (flagId: string) => boolean;

export interface PersonalSpaceSceneOptions {
  readonly attachControls?: boolean;
  readonly resolveFlag?: PersonalSpaceFlagResolver;
}

export interface PersonalSpaceInteractionAnchor {
  readonly id: string;
  readonly kind: PersonalSpaceInteractionKind;
  readonly interactionRadius: number;
  readonly node: TransformNode;
}

export interface PersonalSpaceSceneHandle {
  readonly scene: Scene;
  readonly root: TransformNode;
  readonly camera: FreeCamera;
  readonly assets: ReadonlyMap<string, Mesh>;
  readonly interactionAnchors: ReadonlyMap<
    string,
    PersonalSpaceInteractionAnchor
  >;
  refreshVisibility(resolveFlag?: PersonalSpaceFlagResolver): void;
}

function vector3(tuple: readonly [number, number, number]): Vector3 {
  return new Vector3(tuple[0], tuple[1], tuple[2]);
}

function color3(tuple: readonly [number, number, number]): Color3 {
  return new Color3(tuple[0], tuple[1], tuple[2]);
}

export function createPersonalSpaceScene(
  engine: AbstractEngine,
  input: PersonalSpaceDefinition,
  options: PersonalSpaceSceneOptions = {},
): PersonalSpaceSceneHandle {
  const definition = PersonalSpaceDefinitionSchema.parse(input);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(...definition.environment.clearColor);
  scene.collisionsEnabled = true;

  const root = new TransformNode(
    `personal-space-root-${definition.id}`,
    scene,
  );

  const camera = new FreeCamera(
    `personal-space-camera-${definition.id}`,
    Vector3.Zero(),
    scene,
  );
  camera.parent = root;
  applyLocalTransform(camera, definition.camera.spawn);
  camera.fov = definition.camera.fovRadians;
  camera.minZ = definition.camera.minZ;
  camera.maxZ = definition.camera.maxZ;
  camera.speed = definition.camera.movementSpeed;
  camera.angularSensibility =
    definition.camera.angularSensibility;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.34, 0.84, 0.34);
  camera.applyGravity = false;
  camera.keysUp = [87, 38];
  camera.keysDown = [83, 40];
  camera.keysLeft = [65, 37];
  camera.keysRight = [68, 39];
  scene.activeCamera = camera;

  const bounds = definition.camera.bounds;
  scene.onBeforeRenderObservable.add(() => {
    camera.position.x = Math.min(
      bounds.max[0],
      Math.max(bounds.min[0], camera.position.x),
    );
    camera.position.y = Math.min(
      bounds.max[1],
      Math.max(bounds.min[1], camera.position.y),
    );
    camera.position.z = Math.min(
      bounds.max[2],
      Math.max(bounds.min[2], camera.position.z),
    );
  });

  if (options.attachControls === true) {
    camera.attachControl(true);
  }

  const ambientLight = new HemisphericLight(
    `personal-space-ambient-${definition.id}`,
    vector3(definition.lighting.ambientDirection),
    scene,
  );
  ambientLight.diffuse = color3(
    definition.lighting.ambientColor,
  );
  ambientLight.intensity =
    definition.lighting.ambientIntensity;

  for (const lightDefinition of definition.lighting.practicalLights) {
    const anchor = new TransformNode(
      `personal-space-light-anchor-${lightDefinition.id}`,
      scene,
    );
    anchor.parent = root;
    applyLocalTransform(anchor, lightDefinition.transform);

    const light = new PointLight(
      `personal-space-light-${lightDefinition.id}`,
      Vector3.Zero(),
      scene,
    );
    light.parent = anchor;
    light.diffuse = color3(lightDefinition.color);
    light.intensity = lightDefinition.intensity;
    light.range = lightDefinition.range;
  }

  const assets = new Map<string, Mesh>();

  for (const asset of definition.assets) {
    const mesh = MeshBuilder.CreateBox(
      `personal-space-asset-${definition.id}-${asset.id}`,
      {
        width: asset.size[0],
        height: asset.size[1],
        depth: asset.size[2],
      },
      scene,
    );
    mesh.parent = root;
    mesh.checkCollisions = asset.collidable;
    applyLocalTransform(mesh, asset.transform);

    const material = new StandardMaterial(
      `personal-space-material-${definition.id}-${asset.id}`,
      scene,
    );
    material.diffuseColor = color3(asset.material.diffuseColor);
    material.emissiveColor = color3(
      asset.material.emissiveColor,
    );
    material.specularColor = Color3.Black();
    mesh.material = material;

    assets.set(asset.id, mesh);
  }

  const interactionAnchors = new Map<
    string,
    PersonalSpaceInteractionAnchor
  >();

  for (const anchorDefinition of definition.interactionAnchors) {
    const node = new TransformNode(
      `personal-space-anchor-${definition.id}-${anchorDefinition.id}`,
      scene,
    );
    node.parent = root;
    applyLocalTransform(node, anchorDefinition.transform);

    interactionAnchors.set(anchorDefinition.id, {
      id: anchorDefinition.id,
      kind: anchorDefinition.kind,
      interactionRadius: anchorDefinition.interactionRadius,
      node,
    });
  }

  const authoredFlagDefaults = new Map(
    definition.flags.map((flag) => [
      flag.id,
      flag.defaultValue,
    ]),
  );
  const resolveAuthoredDefault: PersonalSpaceFlagResolver = (
    flagId,
  ) => {
    const value = authoredFlagDefaults.get(flagId);

    if (value === undefined) {
      throw new Error(
        `Unknown personal-space flag requested by renderer: ${flagId}`,
      );
    }

    return value;
  };

  const refreshVisibility = (
    resolveFlag: PersonalSpaceFlagResolver =
      options.resolveFlag ?? resolveAuthoredDefault,
  ): void => {
    for (const asset of definition.assets) {
      const mesh = assets.get(asset.id);

      if (mesh === undefined) {
        throw new Error(
          `Personal space renderer lost asset mesh ${asset.id}.`,
        );
      }

      if (asset.visibility === null) {
        mesh.setEnabled(true);
        continue;
      }

      mesh.setEnabled(
        resolveFlag(asset.visibility.flagId) ===
          asset.visibility.visibleWhen,
      );
    }
  };

  refreshVisibility();

  return {
    scene,
    root,
    camera,
    assets,
    interactionAnchors,
    refreshVisibility,
  };
}
