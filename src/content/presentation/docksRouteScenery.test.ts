import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { describe, expect, it } from 'vitest';
import { TaxiSceneDefinitionSchema } from './TaxiSceneDefinition';
import { createDocksRouteScenery } from './docksRouteScenery';
import { defaultTaxiSceneDefinition } from './defaultTaxiScene';
import { createTaxiScene } from '../../rendering/taxi/createTaxiScene';

describe('authored Docks route scenery', () => {
  it('is deterministic, valid, uniquely identified and restricted to world space', () => {
    const first = createDocksRouteScenery();
    expect(createDocksRouteScenery()).toEqual(first);
    expect(new Set(first.map((item) => item.id)).size).toBe(first.length);
    expect(first.every((item) => item.space === 'world')).toBe(true);
    expect(TaxiSceneDefinitionSchema.safeParse(defaultTaxiSceneDefinition).success).toBe(true);
  });

  it('uses repeatable colored roadway panels and preserves existing scene anchors', () => {
    const assets = createDocksRouteScenery();
    const road = assets.find((asset) => asset.id === 'road-bed');
    const panels = assets.filter((asset) => asset.id.startsWith('road-colored-tile-'));
    const first = panels[0];
    const last = panels[panels.length - 1];
    expect(road).toBeDefined();
    expect(panels).toHaveLength(20);
    expect(new Set(panels.map((asset) => asset.material.textureUrl))).toEqual(
      new Set(['/taxi/docks-road.svg']),
    );
    expect(panels.every((asset) => asset.kind === 'box')).toBe(true);
    // No painted tile extends beyond the continuous ground-contact roadbed.
    if (road === undefined || first === undefined || last === undefined) {
      throw new Error('Docks road geometry missing');
    }
    const min = road.transform.position[2] - road.size[2] / 2;
    const max = road.transform.position[2] + road.size[2] / 2;
    expect(first.transform.position[2] - first.size[2] / 2).toBeGreaterThanOrEqual(min);
    expect(last.transform.position[2] + last.size[2] / 2).toBeLessThanOrEqual(max);
    expect(assets.find((asset) => asset.id === 'lane-marking-1')?.transform.position[2]).toBe(11);
    expect(defaultTaxiSceneDefinition.anchors.passengerSeat.position).toEqual([0.68, 0.36, -0.92]);
  });

  it('provides two visibly supported bridges, grounded cargo carriers and alien signage', () => {
    const assets = createDocksRouteScenery();
    for (const number of [0, 1]) {
      const prefix = `docks-overpass-${number}`;
      const deck = assets.find((asset) => asset.id === `${prefix}-deck`);
      expect(deck).toBeDefined();
      for (const side of ['left', 'right']) {
        const pier = assets.find((asset) => asset.id === `${prefix}-pier-${side}`);
        expect(pier).toBeDefined();
        if (deck === undefined || pier === undefined) throw new Error('Bridge support missing');
        const pierTop = pier.transform.position[1] + pier.size[1] / 2;
        const deckBottom = deck.transform.position[1] - deck.size[1] / 2;
        expect(pierTop).toBeGreaterThan(deckBottom);
      }
    }
    for (const number of [0, 1]) {
      const wheels = assets.filter((asset) => asset.id.startsWith(`docks-cargo-${number}-wheel-`));
      expect(wheels).toHaveLength(4);
      expect(wheels.every((wheel) => wheel.kind === 'cylinder')).toBe(true);
    }
    expect(assets.some((asset) => asset.material.textureUrl === '/taxi/docks-glyph.svg')).toBe(true);
    expect(assets.every((asset) => !asset.id.includes('hover'))).toBe(true);
  });

  it('renders as real Babylon world meshes without lighting the street from the cabin', () => {
    const engine = new NullEngine();
    const handle = createTaxiScene(engine, defaultTaxiSceneDefinition);
    try {
      const panel = handle.scene.getMeshByName('taxi-asset-road-colored-tile-1');
      const building = handle.scene.getMeshByName('taxi-asset-docks-right-0-shell');
      const pier = handle.scene.getMeshByName('taxi-asset-docks-overpass-0-pier-left');
      const wheel = handle.scene.getMeshByName('taxi-asset-docks-cargo-0-wheel-front-right');
      expect(panel).not.toBeNull();
      expect(building).not.toBeNull();
      expect(pier).not.toBeNull();
      expect(wheel).not.toBeNull();
      expect(panel?.parent).toBe(handle.worldRoot);
      expect(building?.parent).toBe(handle.worldRoot);
      expect(handle.cabinLight.canAffectMesh(panel!)).toBe(false);
      expect(panel?.material).toBeInstanceOf(StandardMaterial);
      if (!(panel?.material instanceof StandardMaterial)) throw new Error('Road material missing');
      expect(panel.material.diffuseTexture?.name).toBe('/taxi/docks-road.svg');
      expect(panel.material.emissiveTexture).toBeNull();
      handle.scene.render();
    } finally {
      handle.scene.dispose();
      expect(engine.scenes).toHaveLength(0);
      engine.dispose();
    }
  });
});
