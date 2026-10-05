import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { validateProductionContent } from '../../content/validation/ProductionContentValidator';
import { createInitialEconomyState } from '../economy/EconomyState';
import { createInitialPersonalSpaceState } from '../spaces/PersonalSpaceState';
import { entityId } from '../ids/EntityId';
import { createInitialTranslatorState } from '../translator/TranslatorState';
import { gameSaveCodec } from '../../persistence/save/gameSave';
import {
  RadioStateStore,
  createInitialRadioState,
} from './RadioState';

function createState() {
  const content = validateProductionContent(productionContent);

  return {
    content,
    state: new RadioStateStore(content.radio, {
      translator: content.translator,
      world: content.world,
      jobs: content.jobs,
      passengers: content.passengers,
    }),
  };
}

describe('RadioStateStore', () => {
  it('allows public tuning but requires discovery for hidden stations', () => {
    const { state } = createState();
    const publicStation = entityId('radio-station', 'civic-one');
    const hiddenStation = entityId(
      'radio-station',
      'underchannel',
    );

    state.tune(publicStation);
    expect(state.getTunedStationId()).toBe(publicStation);

    expect(() => state.tune(hiddenStation)).toThrow(
      /has not been discovered/,
    );

    state.discoverStation(hiddenStation);
    state.tune(hiddenStation);

    expect(state.getTunedStationId()).toBe(hiddenStation);
  });

  it('round-trips station discovery, tuning, listening, and heard history through save v6', () => {
    const { content, state } = createState();
    const stationId = entityId('radio-station', 'underchannel');
    const broadcastId = entityId(
      'broadcast',
      'underchannel-clinic-window',
    );

    state.discoverStation(stationId);
    state.tune(stationId);
    state.setListening(true);
    state.markHeard(broadcastId);

    const serialized = gameSaveCodec.serialize(
      {
        rideSession: null,
        socialState: null,
        translatorState: createInitialTranslatorState(),
        economyState: createInitialEconomyState(),
        radioState: state.exportState(),
        personalSpaceState: createInitialPersonalSpaceState(),
      },
      '2026-10-04T13:10:00.000Z',
    );
    const decoded = gameSaveCodec.deserialize(serialized);
    const restored = new RadioStateStore(
      content.radio,
      {
        translator: content.translator,
        world: content.world,
        jobs: content.jobs,
        passengers: content.passengers,
      },
      decoded.state.radioState,
    );

    expect(restored.exportState()).toEqual(state.exportState());
    expect(restored.getTunedStationId()).toBe(stationId);
    expect(restored.isListening()).toBe(true);
    expect(restored.hasHeard(broadcastId)).toBe(true);
  });

  it('creates a deterministic off and untuned migration state', () => {
    expect(createInitialRadioState()).toEqual({
      schemaVersion: 1,
      tunedStationId: null,
      listening: false,
      discoveredStationIds: [],
      heardBroadcastIds: [],
    });
  });
});
