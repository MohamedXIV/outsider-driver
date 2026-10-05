import { Story } from 'inkjs';
import * as z from 'zod';
import { entityIdSchema } from '../domain/ids/EntityId';
import {
  PersonalStableKeySchema,
} from '../content/personal/PersonalPersistenceContracts';
import {
  TranslationRegisterSchema,
  TranslationVocabularyKeySchema,
} from '../content/translator/TranslatorContracts';
import { TranslationRequirementSchema } from '../domain/translator/TranslatorRuntime';
import {
  ClaimAudienceSchema,
  ClaimValueSchema,
  SocialKeySchema,
  type ClaimAudience,
} from '../domain/social/SocialStealthState';
import {
  NarrativeDomainEventSchema,
  type NarrativeEventSink,
  type NarrativeQueryPort,
} from './contracts/NarrativeBoundary';
import {
  NarrativeTurnSchema,
  type NarrativeLine,
  type NarrativeTurn,
} from './contracts/NarrativePresentation';
import {
  compileInkSource,
  type CompiledInkStory,
} from './compileInkSource';

const adjustmentSchema = z.number().min(-100).max(100);
const reasonSchema = SocialKeySchema;

function parseTranslationVocabularyKey(input: unknown): string | null {
  const token = z.string().parse(input);

  return token.length === 0
    ? null
    : TranslationVocabularyKeySchema.parse(token);
}

function parseClaimAudience(input: unknown): ClaimAudience {
  const token = z.string().parse(input);

  if (token === 'public') {
    return ClaimAudienceSchema.parse({
      kind: 'public',
    });
  }

  return ClaimAudienceSchema.parse({
    kind: 'passenger',
    passengerId: entityIdSchema('passenger').parse(token),
  });
}

export class InkNarrativeRuntime {
  readonly #story: Story;
  readonly #queries: NarrativeQueryPort;
  readonly #events: NarrativeEventSink;

  public static fromInkSource(
    source: string,
    queries: NarrativeQueryPort,
    events: NarrativeEventSink,
  ): InkNarrativeRuntime {
    return new InkNarrativeRuntime(
      compileInkSource(source),
      queries,
      events,
    );
  }

  public constructor(
    compiled: CompiledInkStory,
    queries: NarrativeQueryPort,
    events: NarrativeEventSink,
  ) {
    this.#story = new Story(compiled.json);
    this.#queries = queries;
    this.#events = events;
    this.#bindGameBoundary();
  }

  public continueUntilChoiceOrEnd(): NarrativeTurn {
    const lines: NarrativeLine[] = [];

    while (this.#story.canContinue) {
      const text = this.#story.Continue();

      if (text === null) {
        continue;
      }

      const normalized = text.trim();

      if (normalized.length > 0) {
        lines.push({
          text: normalized,
          tags: [...(this.#story.currentTags ?? [])],
        });
      }
    }

    const choices = this.#story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text.trim(),
      tags: [...(choice.tags ?? [])],
    }));

    return NarrativeTurnSchema.parse({
      lines,
      choices,
      ended: choices.length === 0,
    });
  }

  public choose(choiceIndex: number): NarrativeTurn {
    if (
      !Number.isInteger(choiceIndex) ||
      choiceIndex < 0 ||
      choiceIndex >= this.#story.currentChoices.length
    ) {
      throw new RangeError(
        'Narrative choice index is not currently available: ' +
          String(choiceIndex),
      );
    }

    this.#story.ChooseChoiceIndex(choiceIndex);
    return this.continueUntilChoiceOrEnd();
  }

  public serializeState(): string {
    return this.#story.state.ToJson();
  }

  public restoreState(serializedState: string): void {
    if (serializedState.length === 0) {
      throw new Error('Narrative state JSON cannot be empty.');
    }

    this.#story.state.LoadJson(serializedState);
  }

  #bindGameBoundary(): void {
    this.#story.BindExternalFunction(
      'GAME_TRANSLATION_LEVEL',
      (
        languageId: unknown,
        register: unknown,
        vocabularyKey: unknown,
        difficulty: unknown,
      ) => {
        const translator = this.#queries.translator;

        if (translator === undefined) {
          throw new Error(
            'Narrative requested translator capability, but no translator query adapter is configured.',
          );
        }

        return translator.getTranslationLevel(
          TranslationRequirementSchema.parse({
            languageId,
            register: TranslationRegisterSchema.parse(register),
            vocabularyKey: parseTranslationVocabularyKey(vocabularyKey),
            difficulty,
          }),
        );
      },
    );

    this.#story.BindExternalFunction(
      'GAME_HAS_TAXI_CAPABILITY',
      (capability: unknown) => {
        const personal = this.#queries.personal;

        if (personal === undefined) {
          throw new Error(
            'Narrative requested personal persistence capability, but no personal query adapter is configured.',
          );
        }

        return personal.hasTaxiCapability(
          PersonalStableKeySchema.parse(capability),
        );
      },
    );

    this.#story.BindExternalFunction(
      'GAME_HAS_ITEM',
      (itemId: unknown) => {
        const personal = this.#queries.personal;

        if (personal === undefined) {
          throw new Error(
            'Narrative requested personal persistence item state, but no personal query adapter is configured.',
          );
        }

        return personal.hasItem(
          entityIdSchema('item').parse(itemId),
        );
      },
    );

    this.#story.BindExternalFunction(
      'GAME_TAXI_CONDITION',
      () => {
        const personal = this.#queries.personal;

        if (personal === undefined) {
          throw new Error(
            'Narrative requested taxi condition, but no personal query adapter is configured.',
          );
        }

        return personal.getTaxiCondition();
      },
    );

    this.#story.BindExternalFunction(
      'GAME_HAS_UNREAD_MESSAGE',
      (messageId: unknown) => {
        const personal = this.#queries.personal;

        if (personal === undefined) {
          throw new Error(
            'Narrative requested message state, but no personal query adapter is configured.',
          );
        }

        return personal.hasUnreadMessage(
          entityIdSchema('message').parse(messageId),
        );
      },
    );

    this.#story.BindExternalFunction('GAME_HAS_FACT', (factId: unknown) =>
      this.#queries.hasFact(entityIdSchema('fact').parse(factId)),
    );

    this.#story.BindExternalFunction('GAME_HAS_CLAIM', (claimId: unknown) =>
      this.#queries.hasClaim(entityIdSchema('claim').parse(claimId)),
    );

    this.#story.BindExternalFunction(
      'GAME_COVER_MATCHES',
      (key: unknown, value: unknown) =>
        this.#queries.coverIdentityMatches(
          SocialKeySchema.parse(key),
          ClaimValueSchema.parse(value),
        ),
    );

    this.#story.BindExternalFunction(
      'GAME_CLAIM_CONTRADICTS',
      (
        subject: unknown,
        value: unknown,
        context: unknown,
        audience: unknown,
      ) =>
        this.#queries.wouldContradictClaim({
          subject: SocialKeySchema.parse(subject),
          value: ClaimValueSchema.parse(value),
          context: SocialKeySchema.parse(context),
          audience: parseClaimAudience(audience),
        }),
    );

    this.#story.BindExternalFunction(
      'GAME_PASSENGER_SUSPICION',
      (passengerId: unknown) =>
        this.#queries.getPassengerSuspicion(
          entityIdSchema('passenger').parse(passengerId),
        ),
    );

    this.#story.BindExternalFunction('GAME_CITY_ATTENTION', () =>
      this.#queries.getCityAttention(),
    );

    this.#story.BindExternalFunction(
      'GAME_REVEAL_FACT',
      (factId: unknown) => {
        this.#events.emit(
          NarrativeDomainEventSchema.parse({
            type: 'knowledge.reveal',
            factId,
          }),
        );
        return 0;
      },
    );

    this.#story.BindExternalFunction(
      'GAME_RECORD_CLAIM',
      (
        claimId: unknown,
        subject: unknown,
        value: unknown,
        context: unknown,
        audience: unknown,
        sourceId: unknown,
      ) => {
        this.#events.emit(
          NarrativeDomainEventSchema.parse({
            type: 'claim.record',
            claim: {
              id: entityIdSchema('claim').parse(claimId),
              subject: SocialKeySchema.parse(subject),
              value: ClaimValueSchema.parse(value),
              context: SocialKeySchema.parse(context),
              audience: parseClaimAudience(audience),
              source: {
                kind: 'narrative',
                sourceId: SocialKeySchema.parse(sourceId),
              },
            },
          }),
        );
        return 0;
      },
    );

    this.#story.BindExternalFunction(
      'GAME_ADJUST_SUSPICION',
      (passengerId: unknown, delta: unknown, reason: unknown) => {
        this.#events.emit(
          NarrativeDomainEventSchema.parse({
            type: 'suspicion.adjust',
            passengerId,
            delta: adjustmentSchema.parse(delta),
            reason: reasonSchema.parse(reason),
          }),
        );
        return 0;
      },
    );

    this.#story.BindExternalFunction(
      'GAME_ADJUST_CITY_ATTENTION',
      (delta: unknown, reason: unknown) => {
        this.#events.emit(
          NarrativeDomainEventSchema.parse({
            type: 'city-attention.adjust',
            delta: adjustmentSchema.parse(delta),
            reason: reasonSchema.parse(reason),
          }),
        );
        return 0;
      },
    );
  }
}
