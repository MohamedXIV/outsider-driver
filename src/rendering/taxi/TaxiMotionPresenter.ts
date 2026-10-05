import type { MotionIntensityPort } from '../../app/preferences/PresentationPreferencesPort';
import { fullMotionIntensity } from '../../app/preferences/PresentationPreferencesPort';
import type { VehicleDynamicsState } from '../../domain/vehicle/VehicleDynamics';
import type { TaxiSceneHandle } from './createTaxiScene';

export class TaxiMotionPresenter {
  readonly #taxi: TaxiSceneHandle;
  readonly #motion: MotionIntensityPort;

  public constructor(
    taxi: TaxiSceneHandle,
    motion: MotionIntensityPort = fullMotionIntensity,
  ) {
    this.#taxi = taxi;
    this.#motion = motion;
  }

  public apply(state: VehicleDynamicsState): void {
    const intensity = this.#motion.getMotionIntensity();

    this.#taxi.taxiMotionRoot.position.y =
      state.bodyVerticalOffsetMeters * intensity;
    this.#taxi.taxiMotionRoot.rotation.x =
      state.bodyPitchRadians * intensity;
    this.#taxi.taxiMotionRoot.rotation.z =
      state.bodyRollRadians * intensity;

    this.#taxi.cameraMotionRoot.position.y =
      state.cameraVerticalOffsetMeters * intensity;
    this.#taxi.cameraMotionRoot.rotation.x =
      state.cameraPitchRadians * intensity;
    this.#taxi.cameraMotionRoot.rotation.z =
      state.cameraRollRadians * intensity;
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
