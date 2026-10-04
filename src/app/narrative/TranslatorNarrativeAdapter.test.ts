import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { TranslatorRuntime } from '../../domain/translator/TranslatorRuntime';
import { TranslatorStateStore } from '../../domain/translator/TranslatorState';
import { entityId } from '../../domain/ids/EntityId';
import { InkNarrativeRuntime } from '../../narrative/InkNarrativeRuntime';
import type {
  NarrativeEventSink,
  NarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';
import {
  TranslatorNarrativeAdapter,
  withTranslatorNarrativeQueries,
} from './TranslatorNarrativeAdapter';

const baseQueries: NarrativeQueryPort = {
  hasFact: () => false,
  hasClaim: () => false,
  coverIdentityMatches: () => false,
  wouldContradictClaim: () => false,
  getPassengerSuspicion: () => 0,
  getCityAttention: () => 0,
};

const noEvents: NarrativeEventSink = {
  emit: () => undefined,
};

const translatorStory = [
  'EXTERNAL GAME_TRANSLATION_LEVEL(language_id, register, vocabulary_key, difficulty)',
  '-> start',
  '',
  '=== start ===',
  '~ temp level = GAME_TRANSLATION_LEVEL("language:dock-common", "slang", "dock-street", 0.2)',
  '{ level >= 3:',
  '    Passenger: The service gate closes at midnight.',
  '- level >= 2:',
  '    Passenger: Service gate... closes... midnight.',
  '- level >= 1:',
  '    Passenger: ...gate... midnight...',
  '- else:',
  '    Passenger: [unintelligible]',
  '}',
  '-> END',
].join('\n');

describe('Translator narrative adapter', () => {
  it('lets Ink branch on partial comprehension without knowing pack IDs', () => {
    const state = new TranslatorStateStore(
      productionContent.translator,
    );
    const slangPack = entityId(
      'translator-pack',
      'docks-slang-v1',
    );
    state.grantPack(slangPack);
    state.activatePack(slangPack);

    const translator = new TranslatorNarrativeAdapter(
      new TranslatorRuntime(state),
    );
    const runtime = InkNarrativeRuntime.fromInkSource(
      translatorStory,
      withTranslatorNarrativeQueries(baseQueries, translator),
      noEvents,
    );
    const turn = runtime.continueUntilChoiceOrEnd();

    expect(turn.lines.map((line) => line.text)).toContain(
      'Passenger: Service gate... closes... midnight.',
    );
  });

  it('fails clearly when authored translation queries have no translator adapter', () => {
    const runtime = InkNarrativeRuntime.fromInkSource(
      translatorStory,
      baseQueries,
      noEvents,
    );

    expect(() => runtime.continueUntilChoiceOrEnd()).toThrow(
      /no translator query adapter is configured/,
    );
  });
});
