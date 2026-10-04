import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createTaxiScene } from '../taxi/createTaxiScene';
import type { InochiDrawFrame } from './InochiRuntimeContracts';
import { BabylonInochiPassengerRenderer } from './BabylonInochiPassengerRenderer';

function frame(
  blendMode: InochiDrawFrame['commands'][number]['blendMode'] = 'normal',
): InochiDrawFrame {
  return {
    vertices: [
      { x: -100, y: -100, u: 0, v: 0 },
      { x: 100, y: -100, u: 1, v: 0 },
      { x: 0, y: 100, u: 0.5, v: 1 },
    ],
    indices: new Uint32Array([0, 1, 2]),
    textures: [
      {
        id: 77,
        width: 1,
        height: 1,
        channels: 4,
        pixels: new Uint8Array([255, 255, 255, 255]),
      },
    ],
    allocations: [
      {
        vertexOffset: 0,
        indexOffset: 0,
        indexCount: 3,
        vertexCount: 3,
        allocationId: 1,
      },
    ],
    commands: [
      {
        state: 'normal',
        blendMode,
        maskMode: 'mask',
        sourceTextureIds: [77, null, null, null, null, null, null, null],
        allocationId: 1,
        vertexOffset: 0,
        indexOffset: 0,
        elementCount: 3,
        type: 0x101,
        variables: new Uint8Array(64),
      },
    ],
    usesBaseVertex: true,
  };
}

describe('BabylonInochiPassengerRenderer', () => {
  it('places Inochi geometry under the existing passenger seat anchor', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const renderer = new BabylonInochiPassengerRenderer(
      taxi.scene,
      taxi.anchors.passengerSeat,
      {
        pixelsPerSceneUnit: 100,
      },
    );

    renderer.render(frame());

    expect(renderer.root.parent).toBe(taxi.anchors.passengerSeat);
    expect(renderer.getCommandMeshes()).toHaveLength(1);
    const mesh = renderer.getCommandMeshes()[0];

    expect(mesh?.parent).toBe(renderer.root);
    expect(mesh?.alphaIndex).toBe(0);
    expect(mesh?.isPickable).toBe(false);
    expect(mesh?.getTotalVertices()).toBe(3);

    taxi.scene.render();
    renderer.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });

  it.each([
    'normal',
    'multiply',
    'screen',
    'linear-dodge',
    'add-glow',
    'subtract',
  ] as const)('represents supported %s blending without changing gameplay state', (blendMode) => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const renderer = new BabylonInochiPassengerRenderer(
      taxi.scene,
      taxi.anchors.passengerSeat,
    );

    expect(() => renderer.render(frame(blendMode))).not.toThrow();

    renderer.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('fails loud for a blend mode without an exact bridge mapping', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const renderer = new BabylonInochiPassengerRenderer(
      taxi.scene,
      taxi.anchors.passengerSeat,
    );

    expect(() => renderer.render(frame('overlay'))).toThrow(
      /not yet represented exactly/,
    );

    renderer.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('fails loud when mask/composite passes reach the direct drawable backend', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const renderer = new BabylonInochiPassengerRenderer(
      taxi.scene,
      taxi.anchors.passengerSeat,
    );
    const masked = frame();
    const command = masked.commands[0];

    if (command === undefined) {
      throw new Error('Expected fixture draw command.');
    }

    const input: InochiDrawFrame = {
      ...masked,
      commands: [
        {
          ...command,
          state: 'define-mask',
        },
      ],
    };

    expect(() => renderer.render(input)).toThrow(
      /mask\/composite pass backend/,
    );

    renderer.dispose();
    taxi.scene.dispose();
    engine.dispose();
  });

  it('disposes cleanly and rejects use afterwards', () => {
    const engine = new NullEngine();
    const taxi = createTaxiScene(engine, defaultTaxiSceneDefinition);
    const renderer = new BabylonInochiPassengerRenderer(
      taxi.scene,
      taxi.anchors.passengerSeat,
    );

    renderer.render(frame());
    renderer.dispose();
    renderer.dispose();

    expect(() => renderer.render(frame())).toThrow(/disposed/);

    taxi.scene.dispose();
    engine.dispose();
  });
});
