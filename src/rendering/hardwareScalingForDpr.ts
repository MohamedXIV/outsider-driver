/**
 * Render 3D at no more than 1.5 physical pixels per CSS pixel.
 * Babylon's hardware scaling is the reciprocal of the rendered DPR.
 *
 * On the Playwright Pixel 5 profile the previous 2.75 DPR allocated a
 * roughly 1080×1999 WebGL surface behind a ~393px-wide UI. The capped
 * surface uses ~590px width; touch coordinates and CSS UI stay unchanged.
 * This is a player-facing high-DPI GPU cost bound, not a CI-only switch.
 */
export function hardwareScalingForDpr(rawDevicePixelRatio: number): number {
  const devicePixelRatio = Number.isFinite(rawDevicePixelRatio) && rawDevicePixelRatio > 0
    ? rawDevicePixelRatio
    : 1;
  const renderPixelRatio = Math.min(Math.max(devicePixelRatio, 1), 1.5);
  return 1 / renderPixelRatio;
}
