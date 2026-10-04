import type { PassengerId } from '../ids/EntityId';
import {
  isBroadcastScheduledAt,
  type BroadcastDocument,
  type RadioInformationHook,
} from '../../content/radio/RadioContracts';
import type { GameTime } from '../time/GameTime';
import type {
  TranslationAssessment,
  TranslatorRuntime,
} from '../translator/TranslatorRuntime';
import type { RadioStateStore } from './RadioState';

export interface RadioPlayback {
  readonly stationId: NonNullable<
    ReturnType<RadioStateStore['getTunedStationId']>
  >;
  readonly broadcast: BroadcastDocument;
  readonly translation: TranslationAssessment;
  readonly usableInformation: readonly RadioInformationHook[];
  readonly passengerReactionKey: string | null;
  readonly firstListen: boolean;
}

export class RadioRuntime {
  readonly #state: RadioStateStore;
  readonly #translator: TranslatorRuntime;

  public constructor(
    state: RadioStateStore,
    translator: TranslatorRuntime,
  ) {
    this.#state = state;
    this.#translator = translator;
  }

  public listen(
    now: GameTime,
    passengerId: PassengerId | null = null,
  ): RadioPlayback | null {
    if (!this.#state.isListening()) {
      return null;
    }

    const stationId = this.#state.getTunedStationId();

    if (stationId === null) {
      return null;
    }

    const candidates = this.#state
      .getCatalog()
      .broadcasts
      .filter(
        (broadcast) =>
          broadcast.data.stationId === stationId &&
          isBroadcastScheduledAt(broadcast, now),
      )
      .sort(
        (left, right) =>
          right.data.priority - left.data.priority ||
          left.id.localeCompare(right.id),
      );
    const broadcast = candidates[0];

    if (broadcast === undefined) {
      return null;
    }

    const translation = this.#translator.assess({
      languageId: broadcast.data.languageId,
      register: broadcast.data.register,
      vocabularyKey: broadcast.data.vocabularyKey,
      difficulty: broadcast.data.translationDifficulty,
    });
    const usableInformation = broadcast.data.informationHooks.filter(
      (hook) =>
        translation.levelCode >= hook.minimumComprehension,
    );
    const passengerReactionKey =
      passengerId === null
        ? null
        : (broadcast.data.passengerReactions.find(
            (reaction) => reaction.passengerId === passengerId,
          )?.reactionKey ?? null);
    const firstListen = !this.#state.hasHeard(broadcast.id);

    this.#state.markHeard(broadcast.id);

    return {
      stationId,
      broadcast,
      translation,
      usableInformation,
      passengerReactionKey,
      firstListen,
    };
  }
}
