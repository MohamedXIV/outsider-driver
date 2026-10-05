import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { createPersonalSpaceScene } from './createPersonalSpaceScene';

function space(kind: 'garage' | 'home') {
  const definition = productionContent.personalSpaces.spaces.find(
    (candidate) => candidate.kind === kind,
  );

  if (definition === undefined) {
    throw new Error(`Missing production ${kind} space.`);
  }

  return definition;
}

describe('createPersonalSpaceScene', () => {
  it.each(['garage', 'home'] as const)(
    'creates the authored %s as a real Babylon scene with first-person anchors',
    (kind) => {
      const engine = new NullEngine();
      const definition = space(kind);
      const handle = createPersonalSpaceScene(
        engine,
        definition,
      );

      expect(handle.scene.activeCamera).toBe(handle.camera);
      expect(handle.assets.size).toBe(definition.assets.length);
      expect(handle.interactionAnchors.size).toBe(
        definition.interactionAnchors.length,
      );
      expect(
        [...handle.assets.values()].filter(
          (mesh) => mesh.checkCollisions,
        ).length,
      ).toBeGreaterThan(0);

      handle.scene.render();
      handle.scene.dispose();
      engine.dispose();
    },
  );

  it('applies persistent visibility flags without rebuilding the garage scene', () => {
    const engine = new NullEngine();
    const flags = new Map<string, boolean>([
      ['inspection-light', false],
    ]);
    const handle = createPersonalSpaceScene(
      engine,
      space('garage'),
      {
        resolveFlag: (flagId) => flags.get(flagId) ?? false,
      },
    );
    const inspection = handle.assets.get(
      'inspection-light-strip',
    );

    expect(inspection).toBeDefined();
    expect(inspection?.isEnabled()).toBe(false);

    flags.set('inspection-light', true);
    handle.refreshVisibility(
      (flagId) => flags.get(flagId) ?? false,
    );

    expect(inspection?.isEnabled()).toBe(true);

    handle.scene.dispose();
    engine.dispose();
  });

  it('clamps first-person movement to authored space bounds', () => {
    const engine = new NullEngine();
    const definition = space('home');
    const handle = createPersonalSpaceScene(
      engine,
      definition,
    );

    handle.camera.position.set(100, 100, 100);
    handle.scene.render();

    expect(handle.camera.position.x).toBe(
      definition.camera.bounds.max[0],
    );
    expect(handle.camera.position.y).toBe(
      definition.camera.bounds.max[1],
    );
    expect(handle.camera.position.z).toBe(
      definition.camera.bounds.max[2],
    );

    handle.scene.dispose();
    engine.dispose();
  });
});
