/**
 * Presentation-only transition seam for geographically authored animated VN
 * destinations. This module deliberately imports neither Babylon nor Pixi.
 *
 * Arrival/departure validation is delegated to the authoritative player
 * session. Scene factories may later lazily import PixiJS on first entry.
 */
export interface AuthorizedAnchorArrival {
  readonly locationId: string;
  readonly districtId: string;
  /** Opaque canonical navigation token, never interpreted by presentation. */
  readonly returnToken: string;
}

export interface LocationAnchorAccessPort {
  /** Throws unless the player is physically at an accessible authored stop. */
  authorizeArrival(locationId: string): AuthorizedAnchorArrival;
  /** Commits a valid return using the canonical session; may reject departure. */
  confirmDeparture(arrival: AuthorizedAnchorArrival): void;
}

export interface AnimatedAnchorStage {
  readonly canvas: HTMLCanvasElement;
  /** Idempotent resume of this stage's own private animation ticker. */
  start(): void;
  /** Idempotent pause, e.g. hidden document or deliberate scene exit. */
  stop(): void;
  /** Release scene-owned graphics, textures, listeners and renderer resources. */
  dispose(): void;
}

export interface AnimatedAnchorStageFactory {
  create(
    arrival: AuthorizedAnchorArrival,
    signal: AbortSignal,
  ): Promise<AnimatedAnchorStage>;
}

export interface WorldRenderSuspensionPort {
  /**
   * The host must keep independently held pause reasons (Settings, 2D anchor,
   * tab visibility) so releasing one cannot restart another's render loop.
   */
  suspend(reason: 'location-anchor'): void;
  resume(reason: 'location-anchor'): void;
}

export interface AnimatedAnchorOverlayPort {
  showLoading(arrival: AuthorizedAnchorArrival): void;
  showScene(canvas: HTMLCanvasElement, arrival: AuthorizedAnchorArrival): void;
  showError(message: string): void;
  clear(): void;
}

type State =
  | { readonly phase: 'idle' }
  | { readonly phase: 'loading'; readonly request: AbortController }
  | {
      readonly phase: 'active';
      readonly arrival: AuthorizedAnchorArrival;
      readonly stage: AnimatedAnchorStage;
    };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * A single active animated location at a time, with cancellation-safe
 * asynchronous construction and no independent game state.
 *
 * This contract is intentionally not wired into the main app until the
 * stacked GameSession / player-navigation PRs establish final arrival rules.
 */
export class AnimatedAnchorTransitionController {
  readonly #access: LocationAnchorAccessPort;
  readonly #factory: AnimatedAnchorStageFactory;
  readonly #world: WorldRenderSuspensionPort;
  readonly #overlay: AnimatedAnchorOverlayPort;

  #state: State = { phase: 'idle' };
  #visible = true;
  #stageRunning = false;
  #worldSuspended = false;
  #disposed = false;

  public constructor(
    access: LocationAnchorAccessPort,
    factory: AnimatedAnchorStageFactory,
    world: WorldRenderSuspensionPort,
    overlay: AnimatedAnchorOverlayPort,
  ) {
    this.#access = access;
    this.#factory = factory;
    this.#world = world;
    this.#overlay = overlay;
  }

  public get phase(): State['phase'] {
    return this.#state.phase;
  }

  /** Returns false for rejected/obsolete transitions, never a fake arrival. */
  public async enter(locationId: string): Promise<boolean> {
    this.#assertAlive();
    if (this.#state.phase !== 'idle') return false;

    // No loading screen or renderer side effect occurs for invalid arrivals.
    const arrival = this.#access.authorizeArrival(locationId);
    const request = new AbortController();
    this.#state = { phase: 'loading', request };

    try {
      this.#overlay.showLoading(arrival);
      const stage = await this.#factory.create(arrival, request.signal);
      if (this.#disposed || this.#state.phase !== 'loading' ||
          this.#state.request !== request) {
        stage.dispose();
        return false;
      }

      try {
        this.#world.suspend('location-anchor');
        this.#worldSuspended = true;
        this.#state = { phase: 'active', arrival, stage };
        this.#overlay.showScene(stage.canvas, arrival);
        if (this.#visible) {
          stage.start();
          this.#stageRunning = true;
        }
        return true;
      } catch (error: unknown) {
        this.#releaseStage(stage);
        this.#releaseWorld();
        this.#state = { phase: 'idle' };
        this.#overlay.showError(errorMessage(error));
        return false;
      }
    } catch (error: unknown) {
      // Failure of a stale, aborted request must not overwrite the new view.
      if (this.#disposed || this.#state.phase !== 'loading' ||
          this.#state.request !== request) return false;
      this.#state = { phase: 'idle' };
      this.#overlay.showError(errorMessage(error));
      return false;
    }
  }

  /**
   * Depart an ACTIVE anchor, and only after the canonical session accepts it.
   * A rejected departure leaves the scene open with its UI and state intact.
   */
  public exit(): boolean {
    this.#assertAlive();
    if (this.#state.phase === 'idle') return false;
    if (this.#state.phase === 'loading') {
      this.#cancelLoading();
      return true;
    }

    const { arrival, stage } = this.#state;
    this.#access.confirmDeparture(arrival);
    this.#state = { phase: 'idle' };
    this.#releaseStage(stage);
    this.#overlay.clear();
    this.#releaseWorld();
    return true;
  }

  /** Host calls when tab is hidden/restored; never resumes Babylon itself. */
  public setVisible(visible: boolean): void {
    this.#assertAlive();
    if (this.#visible === visible) return;
    this.#visible = visible;
    if (this.#state.phase !== 'active') return;
    if (!visible && this.#stageRunning) {
      this.#state.stage.stop();
      this.#stageRunning = false;
    } else if (visible && !this.#stageRunning) {
      this.#state.stage.start();
      this.#stageRunning = true;
    }
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#state.phase === 'loading') {
      this.#state.request.abort();
    } else if (this.#state.phase === 'active') {
      this.#releaseStage(this.#state.stage);
    }
    this.#state = { phase: 'idle' };
    this.#overlay.clear();
    this.#releaseWorld();
  }

  #cancelLoading(): void {
    if (this.#state.phase !== 'loading') return;
    this.#state.request.abort();
    this.#state = { phase: 'idle' };
    this.#overlay.clear();
  }

  #releaseStage(stage: AnimatedAnchorStage): void {
    if (this.#stageRunning) {
      this.#stageRunning = false;
      stage.stop();
    }
    stage.dispose();
  }

  #releaseWorld(): void {
    if (!this.#worldSuspended) return;
    this.#worldSuspended = false;
    this.#world.resume('location-anchor');
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('AnimatedAnchorTransitionController is disposed.');
    }
  }
}
