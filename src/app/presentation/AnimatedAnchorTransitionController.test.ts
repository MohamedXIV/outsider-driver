import { describe, expect, it, vi } from 'vitest';
import {
  AnimatedAnchorTransitionController,
  type AnimatedAnchorStage,
  type AnimatedAnchorStageFactory,
  type AnimatedAnchorOverlayPort,
  type LocationAnchorAccessPort,
  type WorldRenderSuspensionPort,
} from './AnimatedAnchorTransitionController';

function makeStage() {
  const start = vi.fn();
  const stop = vi.fn();
  const dispose = vi.fn();
  const stage: AnimatedAnchorStage = {
    canvas: {} as HTMLCanvasElement,
    start,
    stop,
    dispose,
  };
  return { stage, start, stop, dispose };
}

function makeHarness(factory: AnimatedAnchorStageFactory) {
  const authorizeArrival = vi.fn((locationId: string) => ({
    locationId,
    districtId: 'district:outer-margin',
    returnToken: 'session-arrival-1',
  }));
  const confirmDeparture = vi.fn();
  const suspend = vi.fn();
  const resume = vi.fn();
  const showLoading = vi.fn();
  const showScene = vi.fn();
  const showError = vi.fn();
  const clear = vi.fn();
  const access: LocationAnchorAccessPort = { authorizeArrival, confirmDeparture };
  const world: WorldRenderSuspensionPort = { suspend, resume };
  const overlay: AnimatedAnchorOverlayPort = {
    showLoading, showScene, showError, clear,
  };
  const controller = new AnimatedAnchorTransitionController(
    access, factory, world, overlay,
  );
  return {
    controller,
    authorizeArrival,
    confirmDeparture,
    suspend,
    resume,
    showLoading,
    showScene,
    showError,
    clear,
  };
}

describe('AnimatedAnchorTransitionController', () => {
  it('enters an authorized location once, suspends world and confirms canonical departure', async () => {
    const { stage, start, stop, dispose } = makeStage();
    const create = vi.fn(() => Promise.resolve(stage));
    const h = makeHarness({ create });

    expect(await h.controller.enter('location:patchworks-parts')).toBe(true);
    expect(h.controller.phase).toBe('active');
    expect(h.authorizeArrival).toHaveBeenCalledWith('location:patchworks-parts');
    expect(h.suspend).toHaveBeenCalledTimes(1);
    expect(h.suspend).toHaveBeenCalledWith('location-anchor');
    expect(h.showScene).toHaveBeenCalledWith(stage.canvas, {
      locationId: 'location:patchworks-parts',
      districtId: 'district:outer-margin',
      returnToken: 'session-arrival-1',
    });
    expect(start).toHaveBeenCalledTimes(1);
    expect(await h.controller.enter('location:anywhere')).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);

    expect(h.controller.exit()).toBe(true);
    expect(h.confirmDeparture).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(h.resume).toHaveBeenCalledTimes(1);
    expect(h.resume).toHaveBeenCalledWith('location-anchor');
    expect(h.controller.phase).toBe('idle');
    expect(h.controller.exit()).toBe(false);
    h.controller.dispose();
  });

  it('rejects an invalid physical arrival before loading visuals', async () => {
    const { stage } = makeStage();
    const create = vi.fn(() => Promise.resolve(stage));
    const h = makeHarness({ create });
    h.authorizeArrival.mockImplementation(() => {
      throw new Error('No physical arrival at that location.');
    });
    await expect(h.controller.enter('location:locked')).rejects.toThrow('No physical arrival');
    expect(create).not.toHaveBeenCalled();
    expect(h.showLoading).not.toHaveBeenCalled();
    expect(h.suspend).not.toHaveBeenCalled();
    expect(h.controller.phase).toBe('idle');
    h.controller.dispose();
  });

  it('cancels a pending load without activating late assets', async () => {
    const { stage, start, dispose } = makeStage();
    let finish!: (scene: AnimatedAnchorStage) => void;
    let signal: AbortSignal | undefined;
    const pending = new Promise<AnimatedAnchorStage>((resolve) => { finish = resolve; });
    const create: AnimatedAnchorStageFactory['create'] = (_arrival, request) => {
      signal = request;
      return pending;
    };
    const h = makeHarness({ create });
    const loading = h.controller.enter('location:shop');
    expect(h.controller.phase).toBe('loading');
    expect(h.controller.exit()).toBe(true);
    expect(signal?.aborted).toBe(true);
    finish(stage);
    await expect(loading).resolves.toBe(false);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
    expect(h.suspend).not.toHaveBeenCalled();
    expect(h.resume).not.toHaveBeenCalled();
    expect(h.showScene).not.toHaveBeenCalled();
    h.controller.dispose();
  });

  it('ignores stale promises when a different shop is now active', async () => {
    const oldStage = makeStage();
    const newStage = makeStage();
    let finish!: (scene: AnimatedAnchorStage) => void;
    const pending = new Promise<AnimatedAnchorStage>((resolve) => { finish = resolve; });
    let calls = 0;
    const h = makeHarness({
      create: () => {
        calls++;
        return calls === 1 ? pending : Promise.resolve(newStage.stage);
      },
    });
    const old = h.controller.enter('location:old');
    h.controller.exit();
    expect(await h.controller.enter('location:new')).toBe(true);
    finish(oldStage.stage);
    await expect(old).resolves.toBe(false);
    expect(oldStage.dispose).toHaveBeenCalledTimes(1);
    expect(newStage.dispose).not.toHaveBeenCalled();
    expect(h.controller.phase).toBe('active');
    expect(h.showScene).toHaveBeenCalledTimes(1);
    h.controller.dispose();
  });

  it('stops the 2D ticker on tab hide without releasing Babylon suspension', async () => {
    const { stage, start, stop, dispose } = makeStage();
    const h = makeHarness({ create: () => Promise.resolve(stage) });
    h.controller.setVisible(false);
    expect(await h.controller.enter('location:shop')).toBe(true);
    expect(start).not.toHaveBeenCalled();
    h.controller.setVisible(true);
    h.controller.setVisible(true);
    expect(start).toHaveBeenCalledTimes(1);
    h.controller.setVisible(false);
    h.controller.setVisible(false);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(h.resume).not.toHaveBeenCalled();
    h.controller.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(h.resume).toHaveBeenCalledTimes(1);
  });

  it('cannot discard an open scene when the real session rejects departure', async () => {
    const { stage, dispose } = makeStage();
    const h = makeHarness({ create: () => Promise.resolve(stage) });
    expect(await h.controller.enter('location:shop')).toBe(true);
    h.confirmDeparture.mockImplementation(() => {
      throw new Error('Cannot depart during unresolved transaction.');
    });
    expect(() => h.controller.exit()).toThrow('unresolved transaction');
    expect(h.controller.phase).toBe('active');
    expect(h.resume).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
    h.controller.dispose();
  });

  it('reports image-load failure in the host UI and leaves the 3D world active', async () => {
    const h = makeHarness({
      create: () => Promise.reject(new Error('Image decode failed.')),
    });
    expect(await h.controller.enter('location:shop')).toBe(false);
    expect(h.controller.phase).toBe('idle');
    expect(h.suspend).not.toHaveBeenCalled();
    expect(h.showError).toHaveBeenCalledWith('Image decode failed.');
    h.controller.dispose();
  });

  it('releases the 3D suspension when an animated stage fails to start', async () => {
    const { stage, start, dispose } = makeStage();
    start.mockImplementation(() => { throw new Error('WebGL context unavailable'); });
    const h = makeHarness({ create: () => Promise.resolve(stage) });
    expect(await h.controller.enter('location:shop')).toBe(false);
    expect(h.controller.phase).toBe('idle');
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(h.resume).toHaveBeenCalledTimes(1);
    expect(h.resume).toHaveBeenCalledWith('location-anchor');
    expect(h.showError).toHaveBeenCalledWith('WebGL context unavailable');
    h.controller.dispose();
  });

  it('cleans a scene that arrives after full app disposal', async () => {
    const { stage, dispose } = makeStage();
    let finish!: (scene: AnimatedAnchorStage) => void;
    const loading = new Promise<AnimatedAnchorStage>((resolve) => { finish = resolve; });
    const h = makeHarness({ create: () => loading });
    const enter = h.controller.enter('location:shop');
    h.controller.dispose();
    finish(stage);
    await expect(enter).resolves.toBe(false);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(h.suspend).not.toHaveBeenCalled();
    await expect(h.controller.enter('location:shop')).rejects.toThrow('disposed');
  });
});
