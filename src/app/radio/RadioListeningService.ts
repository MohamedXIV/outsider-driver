import type { FactId, PassengerId } from '../../domain/ids/EntityId';
import type { SocialStealthStateStore } from '../../domain/social/SocialStealthState';
import type { GameTime } from '../../domain/time/GameTime';
import type {
  RadioPlayback,
  RadioRuntime,
} from '../../domain/radio/RadioRuntime';

export interface RadioListenResult {
  readonly playback: RadioPlayback | null;
  readonly revealedFactIds: readonly FactId[];
}

export class RadioListeningService {
  readonly #runtime: RadioRuntime;
  readonly #social: SocialStealthStateStore | null;

  public constructor(
    runtime: RadioRuntime,
    social: SocialStealthStateStore | null,
  ) {
    this.#runtime = runtime;
    this.#social = social;
  }

  public listen(
    now: GameTime,
    passengerId: PassengerId | null = null,
  ): RadioListenResult {
    const playback = this.#runtime.listen(now, passengerId);

    if (playback === null) {
      return {
        playback: null,
        revealedFactIds: [],
      };
    }

    const revealedFactIds = playback.usableInformation.map(
      (hook) => hook.factId,
    );

    if (this.#social !== null) {
      for (const factId of revealedFactIds) {
        this.#social.learnFact(factId);
      }
    }

    return {
      playback,
      revealedFactIds,
    };
  }
}
