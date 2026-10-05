import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { validateProductionContent } from '../../content/validation/ProductionContentValidator';
import { entityId } from '../../domain/ids/EntityId';
import { PersonalPersistenceStateStore } from '../../domain/personal/PersonalPersistenceState';
import { InkNarrativeRuntime } from '../../narrative/InkNarrativeRuntime';
import type {
  NarrativeEventSink,
  NarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';
import {
  PersonalPersistenceNarrativeAdapter,
  withPersonalPersistenceNarrativeQueries,
} from './PersonalPersistenceNarrativeAdapter';

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

const story = [
  'EXTERNAL GAME_HAS_TAXI_CAPABILITY(capability)',
  'EXTERNAL GAME_HAS_ITEM(item_id)',
  'EXTERNAL GAME_TAXI_CONDITION()',
  'EXTERNAL GAME_HAS_UNREAD_MESSAGE(message_id)',
  '-> start',
  '',
  '=== start ===',
  '~ temp ready = GAME_HAS_TAXI_CAPABILITY("cabin.protection")',
  '~ temp souvenir = GAME_HAS_ITEM("item:docks-clinic-token")',
  '~ temp condition = GAME_TAXI_CONDITION()',
  '~ temp callback = GAME_HAS_UNREAD_MESSAGE("message:first-shift-callback")',
  '{ ready && souvenir && condition >= 80 && callback:',
  '    Passenger: You came prepared.',
  '- else:',
  '    Passenger: Not yet.',
  '}',
  '-> END',
].join('\n');

describe('PersonalPersistenceNarrativeAdapter', () => {
  it('lets authored Ink gate on upgrades items condition and messages', () => {
    const content = validateProductionContent(productionContent);
    const state = new PersonalPersistenceStateStore(
      content.personalPersistence,
      content.passengers,
    );
    const partition = entityId(
      'taxi-upgrade',
      'reinforced-partition-v1',
    );

    state.grantUpgrade(partition);
    state.installUpgrade(partition);
    state.grantItem(entityId('item', 'docks-clinic-token'));
    state.deliverMessage(
      entityId('message', 'first-shift-callback'),
    );

    const runtime = InkNarrativeRuntime.fromInkSource(
      story,
      withPersonalPersistenceNarrativeQueries(
        baseQueries,
        new PersonalPersistenceNarrativeAdapter(state),
      ),
      noEvents,
    );

    expect(
      runtime.continueUntilChoiceOrEnd().lines.map(
        (line) => line.text,
      ),
    ).toContain('Passenger: You came prepared.');
  });
});
