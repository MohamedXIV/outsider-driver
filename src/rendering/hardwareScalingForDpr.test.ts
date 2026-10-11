import { describe, expect, it } from 'vitest';
import { hardwareScalingForDpr } from './hardwareScalingForDpr';

describe('hardwareScalingForDpr', () => {
  it('preserves 1x drawing buffers on regular desktop displays', () => {
    expect(hardwareScalingForDpr(1)).toBe(1);
    expect(hardwareScalingForDpr(0.75)).toBe(1);
  });

  it('retains some retina detail while capping high-DPI mobile GPU pixels', () => {
    expect(hardwareScalingForDpr(1.25)).toBe(0.8);
    expect(hardwareScalingForDpr(1.5)).toBeCloseTo(2 / 3);
    expect(hardwareScalingForDpr(2.75)).toBeCloseTo(2 / 3);
    expect(hardwareScalingForDpr(4)).toBeCloseTo(2 / 3);
  });

  it('never computes invalid hardware scaling for unexpected device DPR values', () => {
    for (const value of [0, -1, Infinity, -Infinity, NaN]) {
      expect(hardwareScalingForDpr(value)).toBe(1);
    }
  });
});
