import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { LocalTransform } from '../../content/presentation/TaxiSceneDefinition';

interface TransformTarget {
  position: Vector3;
  rotation: Vector3;
  scaling: Vector3;
}

function vectorFromTuple(tuple: readonly [number, number, number]): Vector3 {
  return new Vector3(tuple[0], tuple[1], tuple[2]);
}

export function applyLocalTransform(
  target: TransformTarget,
  transform: LocalTransform,
): void {
  target.position.copyFrom(vectorFromTuple(transform.position));
  target.rotation.copyFrom(vectorFromTuple(transform.rotation));
  target.scaling.copyFrom(vectorFromTuple(transform.scale));
}
