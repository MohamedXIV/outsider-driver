import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { createInitialEconomyState } from '../economy/EconomyState';
import { createInitialRadioState } from '../radio/RadioState';
import { createInitialPersonalSpaceState } from '../spaces/PersonalSpaceState';
import { entityId } from '../ids/EntityId';
import { gameSaveCodec } from '../../persistence/save/gameSave';
import {
  TranslatorRuntime,
  TRANSLATION_LEVEL_CODE,
} from './TranslatorRuntime';
import {
  TranslatorStateStore,
  createInitialTranslatorState,
} from './TranslatorState';

describe('TranslatorRuntime', () => {
  it('starts with no comprehension when no pack is active', () => {
    const state = new TranslatorStateStore(
      productionContent.translator,
      createInitialTranslatorState(),
    );
    const runtime = new TranslatorRuntime(state);

    expect(
      runtime.assess({
        languageId: 'language:dock-common',
        register: 'general',
        vocabularyKey: null,
        difficulty: 0.1,
      }),
    ).toEqual({
      level: 'none',
      levelCode: TRANSLATION_LEVEL_CODE.none,
      score: 0,
      matchedPackIds: [],
    });
  });

  it('uses pack-authored capability values to produce full and partial comprehension', () => {
    const state = new TranslatorStateStore(
      productionContent.translator,
    );
    const generalPack = entityId(
      'translator-pack',
      'civic-basic-v1',
    );
    const slangPack = entityId(
      'translator-pack',
      'docks-slang-v1',
    );

    state.grantPack(generalPack);
    state.activatePack(generalPack);
    state.grantPack(slangPack);
    state.activatePack(slangPack);

    const runtime = new TranslatorRuntime(state);
    const general = runtime.assess({
      languageId: 'language:dock-common',
      register: 'general',
      vocabularyKey: null,
      difficulty: 0.1,
    });
    const slang = runtime.assess({
      languageId: 'language:dock-common',
      register: 'slang',
      vocabularyKey: 'dock-street',
      difficulty: 0.2,
    });

    expect(general.level).toBe('full');
    expect(general.levelCode).toBe(3);
    expect(general.matchedPackIds).toEqual([generalPack]);

    expect(slang.level).toBe('partial');
    expect(slang.levelCode).toBe(2);
    expect(slang.score).toBeCloseTo(0.513, 3);
    expect(slang.matchedPackIds).toEqual([slangPack]);
  });

  it('round-trips pack ownership and activation through the production save', () => {
    const state = new TranslatorStateStore(
      productionContent.translator,
    );
    const packId = entityId(
      'translator-pack',
      'docks-slang-v1',
    );
    state.grantPack(packId);
    state.activatePack(packId);

    const serialized = gameSaveCodec.serialize(
      {
        rideSession: null,
        socialState: null,
        translatorState: state.exportState(),
        economyState: createInitialEconomyState(),
        radioState: createInitialRadioState(),
        personalSpaceState: createInitialPersonalSpaceState(),
      },
      '2026-10-04T11:30:00.000Z',
    );
    const decoded = gameSaveCodec.deserialize(serialized);
    const restored = new TranslatorStateStore(
      productionContent.translator,
      decoded.state.translatorState,
    );

    expect(restored.ownsPack(packId)).toBe(true);
    expect(restored.isPackActive(packId)).toBe(true);
    expect(
      new TranslatorRuntime(restored).assess({
        languageId: 'language:dock-common',
        register: 'slang',
        vocabularyKey: 'dock-street',
        difficulty: 0.2,
      }).level,
    ).toBe('partial');
  });

  it('requires ownership before activation', () => {
    const state = new TranslatorStateStore(
      productionContent.translator,
    );

    expect(() =>
      state.activatePack(
        entityId('translator-pack', 'civic-basic-v1'),
      ),
    ).toThrow(/Cannot activate unowned translator pack/);
  });

  it('exposes legality and footprint as generic active risk signals', () => {
    const state = new TranslatorStateStore(
      productionContent.translator,
    );
    const slangPack = entityId(
      'translator-pack',
      'docks-slang-v1',
    );
    state.grantPack(slangPack);
    state.activatePack(slangPack);

    const runtime = new TranslatorRuntime(state);

    expect(runtime.getActiveRiskSignals()).toEqual([
      {
        packId: slangPack,
        legality: 'illegal',
        riskFootprint: 35,
      },
    ]);
  });

  it('rejects activation of a pack incompatible with the runtime API', () => {
    const incompatibleCatalog = {
      ...productionContent.translator,
      packs: [
        {
          ...productionContent.translator.packs[0],
          data: {
            ...productionContent.translator.packs[0].data,
            compatibility: {
              minRuntimeApiVersion: 2,
              maxRuntimeApiVersion: 2,
            },
          },
        },
      ],
    };
    const state = new TranslatorStateStore(incompatibleCatalog);
    const packId = entityId(
      'translator-pack',
      'civic-basic-v1',
    );

    state.grantPack(packId);

    expect(() => state.activatePack(packId)).toThrow(
      /incompatible with runtime API 1/,
    );
  });
});
