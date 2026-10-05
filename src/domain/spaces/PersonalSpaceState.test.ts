import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { createInitialEconomyState } from '../economy/EconomyState';
import { entityId } from '../ids/EntityId';
import { createInitialRadioState } from '../radio/RadioState';
import { createInitialPersonalPersistenceState } from '../personal/PersonalPersistenceState';
import { createInitialTranslatorState } from '../translator/TranslatorState';
import { gameSaveCodec } from '../../persistence/save/gameSave';
import {
  PersonalSpaceStateStore,
  createInitialPersonalSpaceState,
} from './PersonalSpaceState';

describe('PersonalSpaceStateStore', () => {
  it('tracks visits and resolves authored flag defaults with persistent overrides', () => {
    const state = new PersonalSpaceStateStore(
      productionContent.personalSpaces,
    );
    const garageId = entityId('personal-space', 'garage');
    const homeId = entityId('personal-space', 'home');

    expect(state.getCurrentSpaceId()).toBeNull();
    expect(state.getFlag(garageId, 'inspection-light')).toBe(false);

    state.enter(garageId);
    state.setFlag(garageId, 'inspection-light', true);
    state.enter(homeId);

    expect(state.hasVisited(garageId)).toBe(true);
    expect(state.hasVisited(homeId)).toBe(true);
    expect(state.getFlag(garageId, 'inspection-light')).toBe(true);
    expect(state.getCurrentSpaceId()).toBe(homeId);
  });

  it('round-trips current space, visits, and object flags through save v7', () => {
    const state = new PersonalSpaceStateStore(
      productionContent.personalSpaces,
    );
    const garageId = entityId('personal-space', 'garage');

    state.enter(garageId);
    state.setFlag(garageId, 'inspection-light', true);

    const serialized = gameSaveCodec.serialize(
      {
        rideSession: null,
        socialState: null,
        translatorState: createInitialTranslatorState(),
        economyState: createInitialEconomyState(),
        radioState: createInitialRadioState(),
        personalSpaceState: state.exportState(),
        personalPersistenceState:
          createInitialPersonalPersistenceState(),
      },
      '2026-10-05T04:00:00.000Z',
    );
    const decoded = gameSaveCodec.deserialize(serialized);
    const restored = new PersonalSpaceStateStore(
      productionContent.personalSpaces,
      decoded.state.personalSpaceState,
    );

    expect(restored.exportState()).toEqual(state.exportState());
    expect(restored.getCurrentSpaceId()).toBe(garageId);
    expect(restored.hasVisited(garageId)).toBe(true);
    expect(restored.getFlag(garageId, 'inspection-light')).toBe(true);
  });

  it('starts deterministically outside every space without fabricating visits', () => {
    expect(createInitialPersonalSpaceState()).toEqual({
      schemaVersion: 1,
      currentSpaceId: null,
      visitedSpaceIds: [],
      flagOverrides: [],
    });
  });

  it('rejects unknown flags and unknown spaces instead of inventing state', () => {
    const state = new PersonalSpaceStateStore(
      productionContent.personalSpaces,
    );

    expect(() =>
      state.getFlag(
        entityId('personal-space', 'garage'),
        'missing-flag',
      ),
    ).toThrow(/Unknown personal-space flag/);

    expect(() =>
      state.enter(entityId('personal-space', 'not-authored')),
    ).toThrow(/Unknown personal space/);
  });
});
