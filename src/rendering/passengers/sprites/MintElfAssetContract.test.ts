import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '../../../../public/passengers/mint-elf/manifest.json';

describe('Mint elf real-art asset contract', () => {
  it('uses the same fixed artboard as the Babylon texture renderer', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.artboard).toEqual([452, 558]);
    expect(manifest.pieces.map(part => part.id)).toEqual([
      'torso', 'head', 'antenna-right',
    ]);
  });

  it('ships real WebP images for every authored cutout and alternate', () => {
    const names = [
      ...manifest.pieces.map(part => part.image),
      manifest.alternate.spritesheet,
      manifest.alternate.hybrid,
    ];
    expect([...new Set(names)].sort()).toEqual([
      'antenna-right.webp', 'head.webp', 'portrait.webp', 'torso.webp',
    ]);
    for (const name of names) {
      const image = readFileSync(
        new URL('../../../../public/passengers/mint-elf/' + name, import.meta.url),
      );
      expect(image.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(image.subarray(8, 12).toString('ascii')).toBe('WEBP');
      expect(image.byteLength).toBeGreaterThan(1000);
    }
  });
});
