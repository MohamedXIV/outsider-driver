import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { validateProductionContent } from '../../content/validation/ProductionContentValidator';
import { EconomyStateStore } from '../../domain/economy/EconomyState';
import { entityId } from '../../domain/ids/EntityId';
import { PersonalPersistenceStateStore } from '../../domain/personal/PersonalPersistenceState';
import { PersonalPersistenceEconomyService } from './PersonalPersistenceEconomyService';

function fundedEconomy(credits: number): EconomyStateStore {
  return new EconomyStateStore({
    schemaVersion: 1,
    credits,
    lifetimeEarnedCredits: 0,
    lifetimeExpenseCredits: 0,
    officialStanding: 0,
    undergroundAccess: 0,
    settledRideIds: [],
  });
}

describe('PersonalPersistenceEconomyService', () => {
  it('charges purchase and installation before granting installed capability', () => {
    const content = validateProductionContent(productionContent);
    const personal = new PersonalPersistenceStateStore(
      content.personalPersistence,
      content.passengers,
    );
    const economy = fundedEconomy(400);
    const service = new PersonalPersistenceEconomyService(
      economy,
      personal,
    );
    const antenna = entityId(
      'taxi-upgrade',
      'covert-radio-antenna-v1',
    );

    expect(service.purchaseUpgrade(antenna)).toEqual({
      upgradeId: antenna,
      purchaseCostCredits: 180,
      creditsAfter: 220,
    });
    expect(service.installUpgrade(antenna)).toEqual({
      upgradeId: antenna,
      installationCostCredits: 35,
      creditsAfter: 185,
    });
    expect(personal.hasTaxiCapability('radio.hidden-band')).toBe(true);
    expect(economy.exportState().lifetimeExpenseCredits).toBe(215);
  });

  it('charges an authored repair and resolves the issue only on success', () => {
    const content = validateProductionContent(productionContent);
    const personal = new PersonalPersistenceStateStore(
      content.personalPersistence,
      content.passengers,
    );
    const economy = fundedEconomy(100);
    const service = new PersonalPersistenceEconomyService(
      economy,
      personal,
    );

    personal.adjustTaxiCondition(-30);
    personal.reportMaintenanceIssue('brake-pads-worn');

    expect(service.repair('brake-pads-worn')).toEqual({
      issueId: 'brake-pads-worn',
      repairCostCredits: 55,
      creditsAfter: 45,
      taxiConditionAfter: 88,
    });
    expect(personal.hasMaintenanceIssue('brake-pads-worn')).toBe(false);
  });
});
