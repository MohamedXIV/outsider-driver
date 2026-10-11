import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { TaxiSceneDefinitionSchema } from '../../content/presentation/TaxiSceneDefinition';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createTaxiScene } from './createTaxiScene';

describe('createTaxiScene', () => {
  it('creates explicit reusable taxi, camera, world, passenger, and dashboard anchors', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);

    expect(taxi.scene.activeCamera).toBe(taxi.camera);
    expect(taxi.camera.parent).toBe(taxi.cameraMotionRoot);
    expect(taxi.cameraMotionRoot.parent).toBe(taxi.taxiMotionRoot);
    expect(taxi.interiorRoot.parent).toBe(taxi.taxiMotionRoot);
    expect(taxi.worldRoot.parent).toBeNull();

    expect(taxi.anchors.passengerSeat.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.passengerLighting.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.radio.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.navigation.parent).toBe(taxi.interiorRoot);
    expect(taxi.anchors.translator.parent).toBe(taxi.interiorRoot);
    expect(taxi.cabinLight.parent).toBe(taxi.anchors.passengerLighting);

    taxi.scene.render();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('builds curved controls and shares identical materials within scene ownership', () => {
    const engine = new NullEngine();
    const base = defaultTaxiSceneDefinition.assets[0];
    const definition = TaxiSceneDefinitionSchema.parse({
      ...defaultTaxiSceneDefinition,
      assets: ['cylinder', 'torus'].map((kind, index) => ({
        ...base, id: `control-${String(index)}`, kind, tessellation: 16, tubeRatio: 0.1,
      })),
    });
    const taxi = createTaxiScene(engine, definition);
    const first = taxi.scene.getMeshByName('taxi-asset-control-0');
    const second = taxi.scene.getMeshByName('taxi-asset-control-1');
    expect(first?.getTotalVertices()).toBeGreaterThan(24);
    expect(second?.getTotalVertices()).toBeGreaterThan(24);
    expect(first?.material).toBe(second?.material);
    taxi.scene.dispose();
    expect(engine.scenes).toHaveLength(0);
    engine.dispose();
  });

  it('keeps practical cabin light off the street and headlight beams off the seats', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const street = taxi.scene.getMeshByName('taxi-asset-road-bed');
    const seat = taxi.scene.getMeshByName('taxi-asset-passenger-seat-cushion');
    expect(street).not.toBeNull();
    expect(seat).not.toBeNull();
    if (street === null || seat === null) throw new Error('Missing authored geometry');
    expect(taxi.cabinLight.canAffectMesh(street)).toBe(false);
    expect(taxi.cabinLight.canAffectMesh(seat)).toBe(true);
    const headlight = taxi.scene.getLightByName('taxi-headlight-0');
    expect(headlight).not.toBeNull();
    expect(headlight?.canAffectMesh(street)).toBe(true);
    expect(headlight?.canAffectMesh(seat)).toBe(false);
    taxi.scene.dispose();
    engine.dispose();
  });

  it('keeps worn surface textures non-emissive', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const material = taxi.scene.getMeshByName('taxi-asset-dashboard-shell')?.material;
    expect(material).toBeInstanceOf(StandardMaterial);
    if (!(material instanceof StandardMaterial)) throw new Error('Missing dashboard material');
    expect(material.diffuseTexture).not.toBeNull();
    expect(material.emissiveTexture).toBeNull();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('instances repeated authored primitives while retaining each asset transform', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const marking = taxi.scene.getMeshByName('taxi-asset-lane-marking-1');
    expect(marking?.getClassName()).toBe('InstancedMesh');
    expect(marking?.position.z).toBe(11);
    expect(marking?.scaling.asArray()).toEqual([0.1, 0.014, 2]);
    expect(marking?.parent).toBe(taxi.worldRoot);
    taxi.scene.dispose();
    engine.dispose();
  });

  it('keeps instance sources separate across interior and world light assignments', () => {
    const engine = new NullEngine();
    const base = defaultTaxiSceneDefinition.assets[0];
    const definition = TaxiSceneDefinitionSchema.parse({
      ...defaultTaxiSceneDefinition,
      assets: [
        { ...base, id: 'inside', space: 'taxi-interior' },
        { ...base, id: 'outside', space: 'world' },
      ],
    });
    const taxi = createTaxiScene(engine, definition);
    expect(taxi.scene.getMeshByName('taxi-asset-outside')?.getClassName()).toBe('Mesh');
    taxi.scene.dispose();
    engine.dispose();
  });

  it('builds presentation assets from the validated scene definition', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);

    for (const asset of defaultTaxiSceneDefinition.assets) {
      expect(taxi.scene.getMeshByName(`taxi-asset-${asset.id}`)).not.toBeNull();
    }

    taxi.scene.dispose();
    engine.dispose();
  });
});
