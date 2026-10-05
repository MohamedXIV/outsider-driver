import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { validateProductionContent } from '../../content/validation/ProductionContentValidator';
import { entityId } from '../ids/EntityId';
import { createInitialGameState, gameSaveCodec } from '../../persistence/save/gameSave';
import { PersonalPersistenceStateStore } from './PersonalPersistenceState';

function createStore() {
  const content = validateProductionContent(productionContent);

  return new PersonalPersistenceStateStore(
    content.personalPersistence,
    content.passengers,
  );
}

describe('PersonalPersistenceStateStore', () => {
  it('installs only owned upgrades, enforces slots, and exposes capability/risk', () => {
    const store = createStore();
    const antenna = entityId(
      'taxi-upgrade',
      'covert-radio-antenna-v1',
    );
    const partition = entityId(
      'taxi-upgrade',
      'reinforced-partition-v1',
    );

    expect(() => store.installUpgrade(antenna)).toThrow(
      /unowned/,
    );

    store.grantUpgrade(antenna);
    store.installUpgrade(antenna);

    expect(store.hasTaxiCapability('radio.hidden-band')).toBe(true);
    expect(store.getInstalledUpgradeRiskSignals()).toEqual([
      {
        upgradeId: antenna,
        legality: 'illegal',
        riskFootprint: 38,
      },
    ]);

    store.grantUpgrade(partition);
    store.installUpgrade(partition);

    expect(store.hasTaxiCapability('cabin.protection')).toBe(true);
  });

  it('tracks narrative-scale maintenance without a tuning simulation', () => {
    const store = createStore();

    store.adjustTaxiCondition(-32);
    store.reportMaintenanceIssue('brake-pads-worn');

    expect(store.getTaxiCondition()).toBe(68);
    expect(store.needsMaintenance()).toBe(true);
    expect(store.getActiveMaintenanceIssues()).toMatchObject([
      {
        id: 'brake-pads-worn',
        repairCostCredits: 55,
        conditionRestored: 18,
      },
    ]);

    store.resolveMaintenanceIssue('brake-pads-worn');

    expect(store.getTaxiCondition()).toBe(86);
    expect(store.needsMaintenance()).toBe(false);
  });

  it('persists unique souvenirs and explicit callback read state', () => {
    const store = createStore();
    const itemId = entityId('item', 'docks-clinic-token');
    const messageId = entityId(
      'message',
      'first-shift-callback',
    );

    store.grantItem(itemId);
    store.grantItem(itemId);
    store.deliverMessage(messageId);
    store.deliverMessage(messageId);

    expect(store.hasItem(itemId)).toBe(true);
    expect(store.getOwnedItems()).toHaveLength(1);
    expect(store.hasUnreadMessage(messageId)).toBe(true);
    expect(store.getUnreadMessages()).toHaveLength(1);

    store.readMessage(messageId);

    expect(store.hasUnreadMessage(messageId)).toBe(false);
    expect(store.hasUnreadMessages()).toBe(false);
  });

  it('round-trips populated personal progression through the production save', () => {
    const store = createStore();
    const antenna = entityId(
      'taxi-upgrade',
      'covert-radio-antenna-v1',
    );
    const itemId = entityId('item', 'docks-clinic-token');
    const messageId = entityId(
      'message',
      'first-shift-callback',
    );

    store.grantUpgrade(antenna);
    store.installUpgrade(antenna);
    store.adjustTaxiCondition(-21);
    store.reportMaintenanceIssue('cabin-filter-clogged');
    store.grantItem(itemId);
    store.deliverMessage(messageId);

    const encoded = gameSaveCodec.serialize(
      {
        ...createInitialGameState(),
        personalPersistenceState: store.exportState(),
      },
      '2026-10-05T04:30:00.000Z',
    );
    const decoded = gameSaveCodec.deserialize(encoded);
    const restored = new PersonalPersistenceStateStore(
      validateProductionContent(productionContent).personalPersistence,
      validateProductionContent(productionContent).passengers,
      decoded.state.personalPersistenceState,
    );

    expect(restored.exportState()).toEqual(store.exportState());
  });
});
