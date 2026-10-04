import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { EconomyStateStore } from '../../domain/economy/EconomyState';
import { entityId } from '../../domain/ids/EntityId';
import { TranslatorStateStore } from '../../domain/translator/TranslatorState';
import { TranslatorMarketplace } from './TranslatorMarketplace';

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

describe('TranslatorMarketplace', () => {
  it('charges authored pack cost and grants ownership exactly once', () => {
    const economy = fundedEconomy(250);
    const translator = new TranslatorStateStore(
      productionContent.translator,
    );
    const market = new TranslatorMarketplace(
      economy,
      translator,
      productionContent.translator,
    );
    const packId = entityId(
      'translator-pack',
      'civic-basic-v1',
    );

    expect(market.purchase(packId)).toEqual({
      packId,
      costCredits: 120,
      creditsAfter: 130,
    });
    expect(translator.ownsPack(packId)).toBe(true);
    expect(economy.exportState().lifetimeExpenseCredits).toBe(120);

    expect(() => market.purchase(packId)).toThrow(/already owned/);
    expect(economy.getCredits()).toBe(130);
  });

  it('does not grant a pack when the economy cannot afford it', () => {
    const economy = fundedEconomy(100);
    const translator = new TranslatorStateStore(
      productionContent.translator,
    );
    const market = new TranslatorMarketplace(
      economy,
      translator,
      productionContent.translator,
    );
    const packId = entityId(
      'translator-pack',
      'docks-slang-v1',
    );

    expect(() => market.purchase(packId)).toThrow(
      /Insufficient credits/,
    );
    expect(translator.ownsPack(packId)).toBe(false);
    expect(economy.getCredits()).toBe(100);
  });
});
