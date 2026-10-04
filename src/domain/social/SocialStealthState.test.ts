import { describe, expect, it } from 'vitest';
import {
  SocialStealthStateStore,
  createSocialStealthState,
} from './SocialStealthState';
import { entityId } from '../ids/EntityId';

const identity = {
  id: 'identity:docks-driver',
  displayName: 'Nera Vale',
  attributes: [
    {
      key: 'origin',
      value: 'outer-rim',
    },
    {
      key: 'occupation',
      value: 'licensed-driver',
    },
  ],
} as const;

describe('SocialStealthStateStore', () => {
  it('keeps cover identity, knowledge, suspicion, and city attention distinct', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(identity),
    );
    const passengerId = entityId('passenger', 'routine-rider');

    expect(store.coverIdentityMatches('origin', 'outer-rim')).toBe(true);
    expect(store.coverIdentityMatches('origin', 'inner-city')).toBe(false);

    store.learnFact(entityId('fact', 'checkpoint-rumor'));
    store.adjustPassengerSuspicion(
      passengerId,
      25,
      'awkward-answer',
    );
    store.adjustCityAttention(10, 'checkpoint-scan');

    expect(store.hasFact(entityId('fact', 'checkpoint-rumor'))).toBe(true);
    expect(store.getPassengerSuspicion(passengerId)).toBe(25);
    expect(store.getCityAttention()).toBe(10);
  });

  it('detects a contradiction for the same subject/context and overlapping audience', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(identity),
    );
    const passengerId = entityId('passenger', 'recurring-rider');

    store.recordClaim({
      id: 'claim:first-origin-story',
      subject: 'personal-origin',
      value: 'outer-rim',
      context: 'biography',
      audience: {
        kind: 'passenger',
        passengerId,
      },
      source: {
        kind: 'player',
        sourceId: 'choice.origin.outer-rim',
      },
    });

    expect(
      store.wouldContradict({
        subject: 'personal-origin',
        value: 'inner-city',
        context: 'biography',
        audience: {
          kind: 'passenger',
          passengerId,
        },
      }),
    ).toBe(true);

    expect(
      store.wouldContradict({
        subject: 'personal-origin',
        value: 'inner-city',
        context: 'biography',
        audience: {
          kind: 'passenger',
          passengerId: entityId('passenger', 'stranger'),
        },
      }),
    ).toBe(false);
  });

  it('lets public claims overlap every passenger audience', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(identity),
    );

    store.recordClaim({
      id: 'claim:public-origin',
      subject: 'personal-origin',
      value: 'outer-rim',
      context: 'biography',
      audience: {
        kind: 'public',
      },
      source: {
        kind: 'narrative',
        sourceId: 'broadcast-interview',
      },
    });

    expect(
      store.wouldContradict({
        subject: 'personal-origin',
        value: 'inner-city',
        context: 'biography',
        audience: {
          kind: 'passenger',
          passengerId: entityId('passenger', 'story-rider'),
        },
      }),
    ).toBe(true);
  });

  it('is idempotent for the same claim ID/data and rejects ID reuse with different data', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(identity),
    );
    const claim = {
      id: 'claim:occupation-story',
      subject: 'occupation',
      value: 'licensed-driver',
      context: 'biography',
      audience: {
        kind: 'public',
      },
      source: {
        kind: 'identity',
        sourceId: 'cover-profile',
      },
    } as const;

    store.recordClaim(claim);
    store.recordClaim(claim);

    expect(store.exportState().claims).toHaveLength(1);

    expect(() =>
      store.recordClaim({
        ...claim,
        value: 'dock-worker',
      }),
    ).toThrow(/already exists with different data/);
  });

  it('clamps local suspicion and city attention independently', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(identity),
    );
    const passengerId = entityId('passenger', 'routine-rider');

    store.adjustPassengerSuspicion(passengerId, 90, 'first');
    store.adjustPassengerSuspicion(passengerId, 40, 'second');
    store.adjustCityAttention(80, 'scan');
    store.adjustCityAttention(-100, 'cooldown');

    expect(store.getPassengerSuspicion(passengerId)).toBe(100);
    expect(store.getCityAttention()).toBe(0);
  });
});
