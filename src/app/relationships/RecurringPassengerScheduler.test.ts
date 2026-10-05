import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { entityId } from '../../domain/ids/EntityId';
import { RelationshipStateStore } from '../../domain/relationships/RelationshipState';
import {
  SocialStealthStateStore,
  createSocialStealthState,
} from '../../domain/social/SocialStealthState';
import { RecurringPassengerScheduler } from './RecurringPassengerScheduler';

function createHarness() {
  const relationships = new RelationshipStateStore(
    productionContent.relationships,
  );
  const social = new SocialStealthStateStore(
    createSocialStealthState({
      id: 'identity:relationship-test',
      displayName: 'Relationship Test',
      attributes: [],
    }),
  );
  const scheduler = new RecurringPassengerScheduler(
    productionContent.relationships,
    productionContent.passengers,
    relationships,
    social,
  );

  return {
    relationships,
    social,
    scheduler,
  };
}

describe('RecurringPassengerScheduler', () => {
  it('requires prior ride, authored world fact, time window, and cooldown', () => {
    const harness = createHarness();
    const passengerId = entityId(
      'passenger',
      'underground-clinic-rider',
    );

    const initialEligibility = harness.scheduler.evaluate(
      passengerId,
      {
        day: 1,
        minuteOfDay: 20 * 60,
      },
    );

    expect(initialEligibility.eligible).toBe(false);
    expect(initialEligibility.reasons).toContain('completed-rides');
    expect(initialEligibility.reasons).toContain(
      'fact-required:fact:underground-clinic-window',
    );

    harness.relationships.recordCompletedRide(
      entityId('ride', 'recurring-first'),
      passengerId,
      {
        day: 1,
        minuteOfDay: 20 * 60,
      },
    );
    harness.social.learnFact(
      entityId('fact', 'underground-clinic-window'),
    );

    const earlyEligibility = harness.scheduler.evaluate(
      passengerId,
      {
        day: 2,
        minuteOfDay: 1 * 60,
      },
    );

    expect(earlyEligibility.eligible).toBe(false);
    expect(earlyEligibility.reasons).toContain('cooldown');
    expect(earlyEligibility.reasons).toContain('daily-window');

    expect(
      harness.scheduler.evaluate(passengerId, {
        day: 2,
        minuteOfDay: 20 * 60,
      }),
    ).toEqual({
      passengerId,
      eligible: true,
      reasons: [],
    });
  });

  it('can return a trusted passenger even while their human attitude remains hostile', () => {
    const harness = createHarness();
    const passengerId = entityId(
      'passenger',
      'underground-clinic-rider',
    );

    harness.relationships.recordCompletedRide(
      entityId('ride', 'recurring-hostile-human'),
      passengerId,
      {
        day: 4,
        minuteOfDay: 20 * 60,
      },
    );
    harness.relationships.adjustMetric(
      passengerId,
      'trust',
      60,
      'ride.trusted-driver',
    );
    harness.social.learnFact(
      entityId('fact', 'underground-clinic-window'),
    );

    expect(
      harness.relationships.getHumanAttitude(passengerId),
    ).toBe(-45);
    expect(
      harness.scheduler.evaluate(passengerId, {
        day: 5,
        minuteOfDay: 20 * 60,
      }).eligible,
    ).toBe(true);
  });

  it('never schedules a non-recurring passenger through the recurrence path', () => {
    const harness = createHarness();
    const passengerId = entityId(
      'passenger',
      'official-clinic-rider',
    );

    expect(
      harness.scheduler.evaluate(passengerId, {
        day: 50,
        minuteOfDay: 20 * 60,
      }),
    ).toEqual({
      passengerId,
      eligible: false,
      reasons: ['not-recurring'],
    });
  });
});
