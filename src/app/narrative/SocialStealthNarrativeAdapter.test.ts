import { describe, expect, it } from 'vitest';
import {
  SocialStealthStateStore,
  createSocialStealthState,
} from '../../domain/social/SocialStealthState';
import { entityId } from '../../domain/ids/EntityId';
import { InkNarrativeRuntime } from '../../narrative/InkNarrativeRuntime';
import { gameSaveCodec } from '../../persistence/save/gameSave';
import { SocialStealthNarrativeAdapter } from './SocialStealthNarrativeAdapter';

const coverIdentity = {
  id: 'identity:driver-cover',
  displayName: 'Night Driver',
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

const firstRideStory = [
  'EXTERNAL GAME_RECORD_CLAIM(claim_id, subject, value, context, audience, source_id)',
  'EXTERNAL GAME_REVEAL_FACT(fact_id)',
  '-> start',
  '',
  '=== start ===',
  '~ GAME_RECORD_CLAIM("claim:first-origin", "personal-origin", "outer-rim", "biography", "passenger:recurring-rider", "ride-one-origin-choice")',
  '~ GAME_REVEAL_FACT("fact:hidden-service-road")',
  'Passenger: I will remember that.',
  '-> END',
].join('\n');

const laterRideStory = [
  'EXTERNAL GAME_HAS_FACT(fact_id)',
  'EXTERNAL GAME_COVER_MATCHES(key, value)',
  'EXTERNAL GAME_CLAIM_CONTRADICTS(subject, value, context, audience)',
  '-> start',
  '',
  '=== start ===',
  '~ temp knows_route = GAME_HAS_FACT("fact:hidden-service-road")',
  '~ temp cover_matches = GAME_COVER_MATCHES("origin", "outer-rim")',
  '~ temp contradicts = GAME_CLAIM_CONTRADICTS("personal-origin", "inner-city", "biography", "passenger:recurring-rider")',
  '{ knows_route:',
  '    Passenger: You remember the service road.',
  '}',
  '{ cover_matches:',
  '    Driver: My papers still say Outer Rim.',
  '}',
  '{ contradicts:',
  '    Passenger: Last time you told me you were from the Outer Rim.',
  '}',
  '-> END',
].join('\n');

describe('SocialStealthNarrativeAdapter', () => {
  it('lets a later ride use learned knowledge and detect a prior contradictory claim', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(coverIdentity),
    );
    const adapter = new SocialStealthNarrativeAdapter(store);

    const firstRide = InkNarrativeRuntime.fromInkSource(
      firstRideStory,
      adapter,
      adapter,
    );

    expect(firstRide.continueUntilChoiceOrEnd().ended).toBe(true);
    expect(store.hasFact(entityId('fact', 'hidden-service-road'))).toBe(true);
    expect(store.hasClaim(entityId('claim', 'first-origin'))).toBe(true);

    const laterRide = InkNarrativeRuntime.fromInkSource(
      laterRideStory,
      adapter,
      adapter,
    );
    const turn = laterRide.continueUntilChoiceOrEnd();
    const lines = turn.lines.map((line) => line.text);

    expect(lines).toContain(
      'Passenger: You remember the service road.',
    );
    expect(lines).toContain('Driver: My papers still say Outer Rim.');
    expect(lines).toContain(
      'Passenger: Last time you told me you were from the Outer Rim.',
    );
  });

  it('keeps passenger suspicion and city attention distinct through the narrative event adapter', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(coverIdentity),
    );
    const adapter = new SocialStealthNarrativeAdapter(store);
    const passengerId = entityId('passenger', 'routine-rider');

    adapter.emit({
      type: 'suspicion.adjust',
      passengerId,
      delta: 35,
      reason: 'contradictory-answer',
    });
    adapter.emit({
      type: 'city-attention.adjust',
      delta: 9,
      reason: 'checkpoint-record',
    });

    expect(adapter.getPassengerSuspicion(passengerId)).toBe(35);
    expect(adapter.getCityAttention()).toBe(9);
  });

  it('round-trips the complete social state through the production save codec', () => {
    const store = new SocialStealthStateStore(
      createSocialStealthState(coverIdentity),
    );
    const adapter = new SocialStealthNarrativeAdapter(store);
    const passengerId = entityId('passenger', 'recurring-rider');

    adapter.emit({
      type: 'knowledge.reveal',
      factId: entityId('fact', 'hidden-service-road'),
    });
    adapter.emit({
      type: 'claim.record',
      claim: {
        id: entityId('claim', 'saved-origin'),
        subject: 'personal-origin',
        value: 'outer-rim',
        context: 'biography',
        audience: {
          kind: 'passenger',
          passengerId,
        },
        source: {
          kind: 'narrative',
          sourceId: 'saved-ride',
        },
      },
    });
    adapter.emit({
      type: 'suspicion.adjust',
      passengerId,
      delta: 22,
      reason: 'saved-suspicion',
    });
    adapter.emit({
      type: 'city-attention.adjust',
      delta: 7,
      reason: 'saved-attention',
    });

    const serialized = gameSaveCodec.serialize(
      {
        rideSession: null,
        socialState: store.exportState(),
      },
      '2026-10-04T10:00:00.000Z',
    );
    const decoded = gameSaveCodec.deserialize(serialized);

    if (decoded.state.socialState === null) {
      throw new Error('Expected persisted social stealth state.');
    }

    const restored = new SocialStealthStateStore(
      decoded.state.socialState,
    );

    expect(restored.exportState()).toEqual(store.exportState());
    expect(restored.hasFact(entityId('fact', 'hidden-service-road'))).toBe(
      true,
    );
    expect(restored.getPassengerSuspicion(passengerId)).toBe(22);
    expect(restored.getCityAttention()).toBe(7);
    expect(
      restored.wouldContradict({
        subject: 'personal-origin',
        value: 'inner-city',
        context: 'biography',
        audience: {
          kind: 'passenger',
          passengerId,
        },
      }),
    ).toBe(true);
  });
});
