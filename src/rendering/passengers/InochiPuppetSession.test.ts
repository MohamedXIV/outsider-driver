import { describe, expect, it, vi } from 'vitest';
import type {
  InochiDrawFrame,
  InochiPuppetRuntimeHandle,
  InochiRuntimePort,
} from './InochiRuntimeContracts';
import { InochiPuppetSession } from './InochiPuppetSession';

const emptyFrame: InochiDrawFrame = {
  vertices: [],
  indices: new Uint32Array(),
  textures: [],
  allocations: [],
  commands: [],
  usesBaseVertex: true,
};

function createHarness() {
  const values: number[][] = [];
  const update = vi.fn();
  const renderFrame = vi.fn(() => emptyFrame);
  const dispose = vi.fn();

  const handle: InochiPuppetRuntimeHandle = {
    name: 'Fixture Puppet',
    author: 'Fixture Author',
    listParameters: () => [
      {
        name: 'HeadYaw',
        lowerBounds: [-1],
        upperBounds: [1],
        value: [0],
        active: true,
      },
      {
        name: 'Gaze',
        lowerBounds: [-1, -1],
        upperBounds: [1, 1],
        value: [0, 0],
        active: true,
      },
    ],
    setParameter: (_name, next) => {
      values.push([...next]);
    },
    update,
    renderFrame,
    dispose,
  };

  const runtime: InochiRuntimePort = {
    loadPuppet: vi.fn(() => handle),
  };

  return {
    runtime,
    handle,
    values,
    update,
    renderFrame,
    dispose,
  };
}

describe('InochiPuppetSession', () => {
  it('loads bytes, exposes metadata, clamps parameters, and advances one frame', async () => {
    const harness = createHarness();
    const session = await InochiPuppetSession.load(harness.runtime, {
      id: 'fixture-puppet',
      load: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    });

    expect(session.name).toBe('Fixture Puppet');
    expect(session.author).toBe('Fixture Author');
    expect(session.hasParameter('HeadYaw')).toBe(true);

    session.setParameter('HeadYaw', [5]);
    expect(harness.values).toEqual([[1]]);

    expect(session.frame(0.016)).toBe(emptyFrame);
    expect(harness.update).toHaveBeenCalledWith(0.016);
    expect(harness.renderFrame).toHaveBeenCalledWith(0.016);
  });

  it('rejects empty assets and invalid parameter calls', async () => {
    const harness = createHarness();

    await expect(
      InochiPuppetSession.load(harness.runtime, {
        id: 'empty-puppet',
        load: () => Promise.resolve(new ArrayBuffer(0)),
      }),
    ).rejects.toThrow(/asset is empty/);

    const session = await InochiPuppetSession.load(harness.runtime, {
      id: 'fixture-puppet',
      load: () => Promise.resolve(new Uint8Array([1]).buffer),
    });

    expect(() => {
      session.setParameter('Missing', [0]);
    }).toThrow(
      /Unknown Inochi parameter/,
    );
    expect(() => {
      session.setParameter('Gaze', [0]);
    }).toThrow(
      /expects 2 values/,
    );
    expect(() => {
      session.frame(-0.1);
    }).toThrow(/finite non-negative/);
  });

  it('disposes the runtime handle once and fails closed afterwards', async () => {
    const harness = createHarness();
    const session = await InochiPuppetSession.load(harness.runtime, {
      id: 'fixture-puppet',
      load: () => Promise.resolve(new Uint8Array([1]).buffer),
    });

    session.dispose();
    session.dispose();

    expect(harness.dispose).toHaveBeenCalledTimes(1);
    expect(() => {
      session.frame(0);
    }).toThrow(/disposed/);
  });
});
