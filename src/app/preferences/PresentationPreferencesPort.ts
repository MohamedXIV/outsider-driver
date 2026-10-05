export interface MotionIntensityPort {
  getMotionIntensity(): number;
}

export const fullMotionIntensity: MotionIntensityPort = {
  getMotionIntensity: () => 1,
};
