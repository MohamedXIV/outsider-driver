import { describe, expect, it } from 'vitest';
import { productionContent } from '../production/ProductionContent';
import { validateProductionContent } from '../validation/ProductionContentValidator';
import {
  isBroadcastScheduledAt,
  validateRadioCatalog,
} from './RadioContracts';

describe('RadioContracts', () => {
  it('validates the production station/broadcast graph', () => {
    const content = validateProductionContent(productionContent);

    expect(
      validateRadioCatalog(
        content.radio,
        content.translator,
        content.world,
        content.jobs,
        content.passengers,
      ),
    ).toEqual(content.radio);
  });

  it('supports recurring daily programming without a fixed campaign length', () => {
    const content = validateProductionContent(productionContent);
    const broadcast = content.radio.broadcasts.find(
      (candidate) =>
        candidate.id === 'broadcast:civic-evening-traffic',
    );

    if (broadcast === undefined) {
      throw new Error('Expected civic traffic broadcast.');
    }

    expect(
      isBroadcastScheduledAt(broadcast, {
        day: 1,
        minuteOfDay: 20 * 60,
      }),
    ).toBe(true);
    expect(
      isBroadcastScheduledAt(broadcast, {
        day: 10000,
        minuteOfDay: 20 * 60,
      }),
    ).toBe(true);
    expect(
      isBroadcastScheduledAt(broadcast, {
        day: 10000,
        minuteOfDay: 10 * 60,
      }),
    ).toBe(false);
  });

  it('fails closed on an unknown reacting passenger', () => {
    const content = validateProductionContent(productionContent);
    const broken = {
      ...content.radio,
      broadcasts: [
        {
          ...content.radio.broadcasts[0],
          data: {
            ...content.radio.broadcasts[0].data,
            passengerReactions: [
              {
                passengerId: 'passenger:missing-radio-listener',
                reactionKey: 'radio.missing.reaction',
              },
            ],
          },
        },
      ],
    };

    expect(() =>
      validateRadioCatalog(
        broken,
        content.translator,
        content.world,
        content.jobs,
        content.passengers,
      ),
    ).toThrow(/unknown reacting passenger/);
  });
});
