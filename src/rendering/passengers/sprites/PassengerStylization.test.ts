import { describe, expect, it } from 'vitest';
import { groundingShadowAlphas, silhouetteOutlineOffsets } from './PassengerStylization';

describe('passenger grounding and original-art silhouette ink math', () => {
  it('clamps independent cushion/backrest opacity without adding light', () => {
    expect(groundingShadowAlphas(0)).toEqual([0, 0]);
    expect(groundingShadowAlphas(0.5)).toEqual([0.41, 0.3]);
    expect(groundingShadowAlphas(2)).toEqual(groundingShadowAlphas(0.85));
  });
  it('produces a closed, bounded outline kernel without per-layer seams', () => {
    const offsets = silhouetteOutlineOffsets(2);
    expect(offsets).toHaveLength(20);
    expect(offsets[0]?.[0]).toBeCloseTo(2);
    expect(offsets[0]?.[1]).toBeCloseTo(0);
    for (const [x, y] of offsets) expect(Math.hypot(x, y)).toBeCloseTo(2);
    expect(silhouetteOutlineOffsets(8)[0]?.[0]).toBeCloseTo(5);
  });
});
