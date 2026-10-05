import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Constants } from '@babylonjs/core/Engines/constants';
import { describe, expect, it } from 'vitest';
import { defaultTaxiSceneDefinition } from '../../content/presentation/defaultTaxiScene';
import { createTaxiScene } from '../taxi/createTaxiScene';
import type {
  InochiDrawCommand,
  InochiDrawFrame,
} from './InochiRuntimeContracts';
import { BabylonInochiPassengerRenderer } from './BabylonInochiPassengerRenderer';

function partVariables(): Uint8Array {
  const bytes = new Uint8Array(64);
  const view = new DataView(bytes.buffer);

  [1, 1, 1].forEach((value, index) => {
    view.setFloat32(index * 4, value, true);
  });
  [0, 0, 0].forEach((value, index) => {
    view.setFloat32(12 + index * 4, value, true);
  });
  view.setFloat32(28, 1, true);
  view.setFloat32(32, 1, true);

  return bytes;
}

function command(
  state: InochiDrawCommand['state'],
  blendMode: InochiDrawCommand['blendMode'] = 'normal',
): InochiDrawCommand {
  const drawable =
    state === 'normal' || state === 'define-mask';

  return {
    state,
    blendMode,
    maskMode: 'mask',
    sourceTextureIds: drawable
      ? [77, null, null, null, null, null, null, null]
      : [null, null, null, null, null, null, null, null],
    allocationId: 1,
    vertexOffset: 0,
    indexOffset: 0,
    elementCount: drawable ? 6 : 0,
    type: 0x101,
    variables: partVariables(),
  };
}

function frame(
  commands: readonly InochiDrawCommand[] = [
    command('normal'),
  ],
): InochiDrawFrame {
  return {
    vertices: [
      { x: -100, y: -100, u: 0, v: 0 },
      { x: 100, y: -100, u: 1, v: 0 },
      { x: 100, y: 100, u: 1, v: 1 },
      { x: -100, y: 100, u: 0, v: 1 },
    ],
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    textures: [
      {
        id: 77,
        width: 1,
        height: 1,
        channels: 4,
        pixels: new Uint8Array([255, 255, 255, 128]),
      },
    ],
    allocations: [
      {
        vertexOffset: 0,
        indexOffset: 0,
        indexCount: 6,
        vertexCount: 4,
        allocationId: 1,
      },
    ],
    commands,
    usesBaseVertex: true,
  };
}

function createRenderer() {
  const engine = new NullEngine();
  const taxi = createTaxiScene(
    engine,
    defaultTaxiSceneDefinition,
  );
  const renderer = new BabylonInochiPassengerRenderer(
    taxi.scene,
    taxi.anchors.passengerSeat,
    {
      pixelsPerSceneUnit: 100,
      maskResolution: 16,
    },
  );

  return {
    engine,
    taxi,
    renderer,
  };
}

function disposeHarness(
  harness: ReturnType<typeof createRenderer>,
): void {
  harness.renderer.dispose();
  harness.taxi.scene.dispose();
  harness.engine.dispose();
}

describe('BabylonInochiPassengerRenderer', () => {
  it('places Inochi geometry under the existing passenger seat anchor', () => {
    const harness = createRenderer();

    harness.renderer.render(frame());

    expect(harness.renderer.root.parent).toBe(
      harness.taxi.anchors.passengerSeat,
    );
    expect(
      harness.renderer.getCommandMeshes(),
    ).toHaveLength(1);
    const mesh =
      harness.renderer.getCommandMeshes()[0];

    expect(mesh?.parent).toBe(harness.renderer.root);
    expect(mesh?.alphaIndex).toBe(0);
    expect(mesh?.isPickable).toBe(false);
    expect(mesh?.getTotalVertices()).toBe(4);
    expect(
      mesh?.getVerticesData(VertexBuffer.UV2Kind),
    ).toHaveLength(8);
    expect(mesh?.material?.alphaMode).toBe(
      Constants.ALPHA_PREMULTIPLIED_PORTERDUFF,
    );

    harness.taxi.scene.render();
    disposeHarness(harness);
  });

  it.each([
    'normal',
    'screen',
    'linear-dodge',
  ] as const)(
    'uses a reference-exact Babylon blend state for %s',
    (blendMode) => {
      const harness = createRenderer();

      expect(() => {
        harness.renderer.render(
          frame([command('normal', blendMode)]),
        );
      }).not.toThrow();

      disposeHarness(harness);
    },
  );

  it.each([
    'multiply',
    'add-glow',
    'subtract',
    'overlay',
  ] as const)(
    'fails loud rather than approximating unsupported %s blending',
    (blendMode) => {
      const harness = createRenderer();

      expect(() => {
        harness.renderer.render(
          frame([command('normal', blendMode)]),
        );
      }).toThrow(/not yet represented exactly/);

      disposeHarness(harness);
    },
  );

  it('renders current push/define/draw/pop soft-mask state instead of rejecting it', () => {
    const harness = createRenderer();

    expect(() => {
      harness.renderer.render(
        frame([
          command('push-mask'),
          command('define-mask'),
          command('normal'),
          command('pop-mask'),
        ]),
      );
      harness.taxi.scene.render();
    }).not.toThrow();

    expect(
      harness.renderer.getCommandMeshes(),
    ).toHaveLength(1);

    disposeHarness(harness);
  });

  it('keeps composite passes fail-closed until the framebuffer backend owns them', () => {
    const harness = createRenderer();

    expect(() => {
      harness.renderer.render(
        frame([
          command('composite-begin'),
          command('normal'),
          command('composite-end'),
          {
            ...command('composite-blit'),
            elementCount: 6,
            sourceTextureIds: [
              77,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            ],
          },
        ]),
      );
    }).toThrow(/composite framebuffer backend/);

    disposeHarness(harness);
  });

  it('accepts the official emissive attachment and preserves explicit passenger lighting state', () => {
    const harness = createRenderer();
    const baseFrame = frame();
    const baseCommand = baseFrame.commands[0];

    if (baseCommand === undefined) {
      throw new Error('Expected fixture draw command.');
    }

    harness.renderer.setLighting({
      ambientColor: [0.2, 0.3, 0.5],
      ambientIntensity: 0.6,
      keyColor: [1, 0.4, 0.2],
      keyIntensity: 1.1,
      keyDirection: [0.2, 0.4, 1],
      accentColor: [0.1, 0.5, 1],
      accentIntensity: 0.8,
      accentDirection: [-0.4, 0.1, 1],
    });

    const litFrame: InochiDrawFrame = {
      ...baseFrame,
      textures: [
        ...baseFrame.textures,
        {
          id: 78,
          width: 1,
          height: 1,
          channels: 4,
          pixels: new Uint8Array([64, 32, 16, 255]),
        },
      ],
      commands: [
        {
          ...baseCommand,
          sourceTextureIds: [
            77,
            78,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
        },
      ],
    };

    expect(() => {
      harness.renderer.render(litFrame);
      harness.taxi.scene.render();
    }).not.toThrow();
    expect(harness.renderer.getLightingState()).toMatchObject({
      ambientIntensity: 0.6,
      keyIntensity: 1.1,
      accentIntensity: 0.8,
    });

    disposeHarness(harness);
  });

  it('keeps the official bump-map attachment fail-closed until exact semantics are implemented', () => {
    const harness = createRenderer();
    const baseFrame = frame();
    const baseCommand = baseFrame.commands[0];

    if (baseCommand === undefined) {
      throw new Error('Expected fixture draw command.');
    }

    const bumpFrame: InochiDrawFrame = {
      ...baseFrame,
      textures: [
        ...baseFrame.textures,
        {
          id: 79,
          width: 1,
          height: 1,
          channels: 4,
          pixels: new Uint8Array([128, 128, 255, 255]),
        },
      ],
      commands: [
        {
          ...baseCommand,
          sourceTextureIds: [
            77,
            null,
            79,
            null,
            null,
            null,
            null,
            null,
          ],
        },
      ],
    };

    expect(() => {
      harness.renderer.render(bumpFrame);
    }).toThrow(/Bumpmap is not represented exactly/);

    disposeHarness(harness);
  });

  it('disposes cleanly and rejects use afterwards', () => {
    const harness = createRenderer();

    harness.renderer.render(frame());
    harness.renderer.dispose();
    harness.renderer.dispose();

    expect(() => {
      harness.renderer.render(frame());
    }).toThrow(/disposed/);

    harness.taxi.scene.dispose();
    harness.engine.dispose();
  });
});
