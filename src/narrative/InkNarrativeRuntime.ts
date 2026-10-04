import { Story } from 'inkjs';
import * as z from 'zod';
import {
  NarrativeDomainEventSchema,
  type NarrativeEventSink,
  type NarrativeQueryPort,
} from './contracts/NarrativeBoundary';
import {
  compileInkSource,
  type CompiledInkStory,
} from './compileInkSource';
import { entityIdSchema } from '../domain/ids/EntityId';

const adjustmentSchema = z.number().min(-100).max(100);
const reasonSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const NarrativeChoiceSchema = z
  .object({
    index: z.number().int().nonnegative(),
    text: z.string(),
    tags: z.array(z.string()),
  })
  .strict();

export const NarrativeLineSchema = z
  .object({
    text: z.string(),
    tags: z.array(z.string()),
  })
  .strict();

export const NarrativeTurnSchema = z
  .object({
    lines: z.array(NarrativeLineSchema),
    choices: z.array(NarrativeChoiceSchema),
    ended: z.boolean(),
  })
  .strict();

export type NarrativeChoice = z.infer<typeof NarrativeChoiceSchema>;
export type NarrativeLine = z.infer<typeof NarrativeLineSchema>;
export type NarrativeTurn = z.infer<typeof NarrativeTurnSchema>;

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
    this.#story.BindExternalFunction('GAME_HAS_FACT', (factId: unknown) =>
      this.#queries.hasFact(entityIdSchema('fact').parse(factId)),
    );

    this.#story.BindExternalFunction('GAME_HAS_CLAIM', (claimId: unknown) =>
      this.#queries.hasClaim(entityIdSchema('claim').parse(claimId)),
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
