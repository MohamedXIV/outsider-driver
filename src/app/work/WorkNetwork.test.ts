import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { EconomyStateStore } from '../../domain/economy/EconomyState';
import {
  SocialStealthStateStore,
  createSocialStealthState,
} from '../../domain/social/SocialStealthState';
import {
  WorkNetwork,
  createWorkEligibilityContext,
} from './WorkNetwork';

const shiftTime = {
  day: 1,
  minuteOfDay: 20 * 60,
} as const;

describe('WorkNetwork', () => {
  it('offers the underground network before the player has an official cover', () => {
    const economy = new EconomyStateStore();
    const network = new WorkNetwork(productionContent.jobs);

    const available = network.listAvailable(
      shiftTime,
      createWorkEligibilityContext(economy, null),
    );

    expect(available.map((entry) => entry.job.id)).toEqual([
      'job:docks-underground-clinic',
    ]);
    expect(available[0]?.channel).toBe('underground');
  });

  it('unlocks official work when the authored cover requirement is actually met', () => {
    const economy = new EconomyStateStore();
    const social = new SocialStealthStateStore(
      createSocialStealthState({
        id: 'identity:licensed-cover',
        displayName: 'Licensed Driver',
        attributes: [
          {
            key: 'work-permit',
            value: 'licensed-driver',
          },
        ],
      }),
    );
    const network = new WorkNetwork(productionContent.jobs);

    const available = network.listAvailable(
      shiftTime,
      createWorkEligibilityContext(economy, social),
    );

    expect(available.map((entry) => entry.job.id)).toEqual([
      'job:docks-official-clinic',
      'job:docks-underground-clinic',
    ]);
  });

  it('lists locked official and expired work with actionable eligibility reasons', () => {
    const network = new WorkNetwork(productionContent.jobs);
    const ctx = createWorkEligibilityContext(new EconomyStateStore(), null);
    const offered = network.listOffers(shiftTime, ctx);
    expect(offered.map((x) => ({ id: x.job.id, eligible: x.eligible }))).toEqual([
      { id: 'job:docks-official-clinic', eligible: false },
      { id: 'job:docks-underground-clinic', eligible: true },
    ]);
    expect(offered[0]?.reasons).toContain('cover:work-permit');
    const expired = network.listOffers({ day: 2, minuteOfDay: 3 * 60 }, ctx);
    expect(expired.every((x) => x.reasons.includes('availability:expired'))).toBe(true);
    expect(network.listAvailable(shiftTime, ctx)).toHaveLength(1);
  });

  it('does not surface jobs outside their authored availability window', () => {
    const economy = new EconomyStateStore();
    const network = new WorkNetwork(productionContent.jobs);

    expect(
      network.listAvailable(
        {
          day: 2,
          minuteOfDay: 3 * 60,
        },
        createWorkEligibilityContext(economy, null),
      ),
    ).toEqual([]);
  });
});
