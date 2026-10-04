import type { VehicleDynamicsState } from '../../domain/vehicle/VehicleDynamics';
import type { TaxiSceneHandle } from './createTaxiScene';

export class TaxiMotionPresenter {
  readonly #taxi: TaxiSceneHandle;

  public constructor(taxi: TaxiSceneHandle) {
    this.#taxi = taxi;
  }

  public apply(state: VehicleDynamicsState): void {
    this.#taxi.taxiMotionRoot.position.y =
      state.bodyVerticalOffsetMeters;
    this.#taxi.taxiMotionRoot.rotation.x = state.bodyPitchRadians;
    this.#taxi.taxiMotionRoot.rotation.z = state.bodyRollRadians;

    this.#taxi.cameraMotionRoot.position.y =
      state.cameraVerticalOffsetMeters;
    this.#taxi.cameraMotionRoot.rotation.x = state.cameraPitchRadians;
    this.#taxi.cameraMotionRoot.rotation.z = state.cameraRollRadians;
  }

  public reset(): void {
    this.#taxi.taxiMotionRoot.position.y = 0;
    this.#taxi.taxiMotionRoot.rotation.x = 0;
    this.#taxi.taxiMotionRoot.rotation.z = 0;
    this.#taxi.cameraMotionRoot.position.y = 0;
    this.#taxi.cameraMotionRoot.rotation.x = 0;
    this.#taxi.cameraMotionRoot.rotation.z = 0;
  }
}
