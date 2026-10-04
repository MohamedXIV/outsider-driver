import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';

/**
 * Permanent bootstrap/loading scene. Gameplay scenes will be composed above
 * this rendering foundation rather than replacing the runtime itself.
 */
export function createBootScene(engine: AbstractEngine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.01, 0.015, 0.028, 1);

  const camera = new FreeCamera('boot-camera', new Vector3(0, 1.6, -3), scene);
  camera.setTarget(Vector3.Zero());
  scene.activeCamera = camera;

  return scene;
}
