import { describe, expect, it, vi } from 'vitest';
import {
  AnimatedAnchorTransitionController,
  type AnimatedAnchorStage,
  type AnimatedAnchorStageFactory,
  type AnimatedAnchorOverlayPort,
  type LocationAnchorAccessPort,
  type WorldRenderSuspensionPort,
} from './AnimatedAnchorTransitionController';

function stageFixture(): AnimatedAnchorStage & {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
} {
  return {
    canvas: {} as HTMLCanvasElement,
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  };
}

function fixture(factory: AnimatedAnchorStageFactory) {
  const access: LocationAnchorAccessPort = {
    authorizeArrival: vi.fn((locationId: string) => ({
      locationId,
      districtId: 'district:outer-margin',
      returnToken: 'session-arrival-1',
    })),
    confirmDeparture: vi.fn(),
  };
  const world: WorldRenderSuspensionPort = {
    suspend: vi.fn(),
    resume: vi.fn(),
  };
  const overlay: AnimatedAnchorOverlayPort = {
    showLoading: vi.fn(),
    showScene: vi.fn(),
    showError: vi.fn(),
    clear: vi.fn(),
  };
  return {
    access,
    world,
    overlay,
    controller: new AnimatedAnchorTransitionController(
      access, factory, world, overlay,
    ),
  };
}

describe('AnimatedAnchorTransitionController', () => {
  it('only presents an authorized arrival, suspends world once and resumes on canonical departure', async () => {
    const scene = stageFixture();
    const factory: AnimatedAnchorStageFactory = {
      create: vi.fn(() => Promise.resolve(scene)),
    };
    const { access, world, overlay, controller } = fixture(factory);

    expect(await controller.enter('location:patchworks-parts')).toBe(true);
    expect(controller.phase).toBe('active');
    expect(access.authorizeArrival).toHaveBeenCalledWith('location:patchworks-parts');
    expect(world.suspend).toHaveBeenCalledTimes(1);
    expect(world.suspend).toHaveBeenCalledWith('location-anchor');
    expect(overlay.showScene).toHaveBeenCalledWith(scene.canvas, {
      locationId: 'location:patchworks-parts',
      districtId: 'district:outer-margin',
      returnToken: 'session-arrival-1',
    });
    expect(scene.start).toHaveBeenCalledTimes(1);
    expect(await controller.enter('location:anywhere')).toBe(false);
    expect(factory.create).toHaveBeenCalledTimes(1);

    expect(controller.exit()).toBe(true);
    expect(access.confirmDeparture).toHaveBeenCalledTimes(1);
    expect(scene.stop).toHaveBeenCalledTimes(1);
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(world.resume).toHaveBeenCalledTimes(1);
    expect(world.resume).toHaveBeenCalledWith('location-anchor');
    expect(controller.phase).toBe('idle');
    expect(controller.exit()).toBe(false);
    controller.dispose();
  });

  it('does not trigger loading or a GPU renderer for an invalid arrival', async () => {
    const scene = stageFixture();
    const factory: AnimatedAnchorStageFactory = {
      create: vi.fn(() => Promise.resolve(scene)),
    };
    const { access, world, overlay, controller } = fixture(factory);
    vi.mocked(access.authorizeArrival).mockImplementation(() => {
      throw new Error('No physical arrival at that location.');
    });
    await expect(controller.enter('location:locked-shop')).rejects.toThrow('No physical arrival');
    expect(factory.create).not.toHaveBeenCalled();
    expect(overlay.showLoading).not.toHaveBeenCalled();
    expect(world.suspend).not.toHaveBeenCalled();
    expect(controller.phase).toBe('idle');
    controller.dispose();
  });

  it('cancels pending loading without leaking a late Pixi canvas or restarting Babylon', async () => {
    const scene = stageFixture();
    let finish!: (scene: AnimatedAnchorStage) => void;
    let requestSignal: AbortSignal | undefined;
    const pending = new Promise<AnimatedAnchorStage>((resolve) => { finish = resolve; });
    const factory: AnimatedAnchorStageFactory = {
      create: vi.fn((_arrival, signal) => {
        requestSignal = signal;
        return pending;
      }),
    };
    const { world, overlay, controller } = fixture(factory);

    const loading = controller.enter('location:patchworks-parts');
    expect(controller.phase).toBe('loading');
    expect(controller.exit()).toBe(true);
    expect(requestSignal?.aborted).toBe(true);
    expect(controller.phase).toBe('idle');
    finish(scene);
    await expect(loading).resolves.toBe(false);
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(scene.start).not.toHaveBeenCalled();
    expect(world.suspend).not.toHaveBeenCalled();
    expect(world.resume).not.toHaveBeenCalled();
    expect(overlay.showScene).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('preserves a newer anchor when a canceled earlier request resolves late', async () => {
    const stale = stageFixture();
    const current = stageFixture();
    let finish!: (scene: AnimatedAnchorStage) => void;
    const pending = new Promise<AnimatedAnchorStage>((resolve) => { finish = resolve; });
    let calls = 0;
    const factory: AnimatedAnchorStageFactory = {
      create: vi.fn(() => {
        calls++;
        return calls === 1 ? pending : Promise.resolve(current);
      }),
    };
    const { controller, overlay } = fixture(factory);

    const old = controller.enter('location:old');
    controller.exit();
    expect(await controller.enter('location:new')).toBe(true);
    finish(stale);
    await expect(old).resolves.toBe(false);
    expect(stale.dispose).toHaveBeenCalledTimes(1);
    expect(current.dispose).not.toHaveBeenCalled();
    expect(controller.phase).toBe('active');
    expect(overlay.showScene).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('stops the animation ticker in a hidden tab without releasing the Babylon suspension', async () => {
    const scene = stageFixture();
    const { controller, world } = fixture({
      create: () => Promise.resolve(scene),
    });
    controller.setVisible(false);
    expect(await controller.enter('location:shop')).toBe(true);
    expect(scene.start).not.toHaveBeenCalled();
    controller.setVisible(true);
    controller.setVisible(true);
    expect(scene.start).toHaveBeenCalledTimes(1);
    controller.setVisible(false);
    controller.setVisible(false);
    expect(scene.stop).toHaveBeenCalledTimes(1);
    expect(world.resume).not.toHaveBeenCalled();
    controller.dispose();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(world.resume).toHaveBeenCalledTimes(1);
  });

  it('keeps the 2D scene active if the canonical session rejects departure', async () => {
    const scene = stageFixture();
    const { controller, access, world } = fixture({
      create: () => Promise.resolve(scene),
    });
    expect(await controller.enter('location:shop')).toBe(true);
    vi.mocked(access.confirmDeparture).mockImplementation(() => {
      throw new Error('Cannot depart during an unresolved transaction.');
    });
    expect(() => controller.exit()).toThrow('unresolved transaction');
    expect(controller.phase).toBe('active');
    expect(world.resume).not.toHaveBeenCalled();
    expect(scene.dispose).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('recovers from a rejected asset load with a readable UI error, not a blank renderer', async () => {
    const { controller, world, overlay } = fixture({
      create: () => Promise.reject(new Error('Image decode failed.')),
    });
    expect(await controller.enter('location:shop')).toBe(false);
    expect(controller.phase).toBe('idle');
    expect(world.suspend).not.toHaveBeenCalled();
    expect(overlay.showError).toHaveBeenCalledWith('Image decode failed.');
    controller.dispose();
  });

  it('rolls back a failed stage start and never leaves the 3D renderer suspended', async () => {
    const scene = stageFixture();
    scene.start.mockImplementation(() => { throw new Error('WebGL context unavailable'); });
    const { controller, world, overlay } = fixture({
      create: () => Promise.resolve(scene),
    });
    expect(await controller.enter('location:shop')).toBe(false);
    expect(controller.phase).toBe('idle');
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(world.resume).toHaveBeenCalledExactlyOnceWith('location-anchor');
    expect(overlay.showError).toHaveBeenCalledWith('WebGL context unavailable');
    controller.dispose();
  });

  it('disposes a late scene after app teardown and refuses another entry', async () => {
    const scene = stageFixture();
    let finish!: (value: AnimatedAnchorStage) => void;
    const loading = new Promise<AnimatedAnchorStage>((resolve) => { finish = resolve; });
    const { controller, world } = fixture({
      create: () => loading,
    });
    const entered = controller.enter('location:shop');
    controller.dispose();
    finish(scene);
    expect(await entered).toBe(false);
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(world.suspend).not.toHaveBeenCalled();
    await expect(controller.enter('location:shop')).rejects.toThrow('disposed');
  });
});
