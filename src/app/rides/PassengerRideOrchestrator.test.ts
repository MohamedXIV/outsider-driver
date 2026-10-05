import { describe, expect, it } from 'vitest';
import { createPassengerFixture } from '../../content/passengers/fixtures/passengerFixture';
import { foundationPassengerInkSource } from '../../content/narrative/foundationPassengerStory';
import { createRouteExperienceFixture } from '../../content/routes/fixtures/routeExperienceFixture';
import { createRouteMotionFixture } from '../../content/routes/fixtures/routeMotionFixture';
import { createWorldFixture } from '../../content/world/fixtures/worldFixture';
import {
  entityId,
  type PassengerId,
} from '../../domain/ids/EntityId';
import type { NarrativeDomainEvent } from '../../narrative/contracts/NarrativeBoundary';
import { createInitialEconomyState } from '../../domain/economy/EconomyState';
import { createInitialRadioState } from '../../domain/radio/RadioState';
import { createInitialRelationshipState } from '../../domain/relationships/RelationshipState';
import { createInitialPersonalSpaceState } from '../../domain/spaces/PersonalSpaceState';
import { createInitialPersonalPersistenceState } from '../../domain/personal/PersonalPersistenceState';
import { createInitialTranslatorState } from '../../domain/translator/TranslatorState';
import {
  gameSaveCodec,
  type GameState,
} from '../../persistence/save/gameSave';
import {
  PassengerRideOrchestrator,
  type PassengerRideDependencies,
  type RideCompletionContext,
} from './PassengerRideOrchestrator';

const acceptedAt = {
  day: 18,
  minuteOfDay: 20 * 60,
} as const;

const pickupAt = {
  day: 18,
  minuteOfDay: 20 * 60 + 1,
} as const;

const completedAt = {
  day: 18,
  minuteOfDay: 20 * 60 + 10,
} as const;

function createJob(passengerId: PassengerId) {
  return {
    id: `job:${passengerId.slice('passenger:'.length)}-night`,
    passengerId,
    pickupLocationId: 'location:docks-taxi-rank',
    destinationLocationId: 'location:docks-clinic',
    routeId: 'route:docks-night',
    availability: {
      opensAt: acceptedAt,
      closesAt: {
        day: 19,
        minuteOfDay: 2 * 60,
      },
    },
    source: {
      kind: 'underground' as const,
      minimumUndergroundAccess: 0,
      riskFootprint: 15,
    },
    fare: {
      baseCredits: 30,
      perMinuteCredits: 2,
      completionBonusCredits: 5,
    },
    expenses: {
      dispatchFeeCredits: 3,
      operatingCreditsPerMinute: 1,
    },
    completionEffects: {
      officialStandingDelta: 0,
      undergroundAccessDelta: 1,
    },
  };
}

interface HarnessOptions {
  readonly failCompletion?: boolean;
}

function createHarness(options: HarnessOptions = {}) {
  const narrativeEvents: NarrativeDomainEvent[] = [];
  const completions: RideCompletionContext[] = [];

  const dependencies: PassengerRideDependencies = {
    world: createWorldFixture(),
    motionCatalog: createRouteMotionFixture(),
    routeExperience: createRouteExperienceFixture(),
    passengers: createPassengerFixture(),
    narrativeStories: {
      getInkSource: (storyId) => {
        if (storyId !== 'foundation-passenger') {
          throw new Error('Unknown narrative story fixture: ' + storyId);
        }

        return foundationPassengerInkSource;
      },
    },
    narrativeQueries: {
      hasFact: () => false,
      hasClaim: () => false,
      coverIdentityMatches: () => false,
      wouldContradictClaim: () => false,
      getPassengerSuspicion: () => 0,
      getCityAttention: () => 0,
    },
    narrativeEvents: {
      emit: (event) => {
        narrativeEvents.push(event);
      },
    },
    workEligibility: {
      officialStanding: 0,
      undergroundAccess: 100,
      coverIdentityMatches: () => false,
    },
    completion: {
      commit: (context) => {
        if (options.failCompletion === true) {
          throw new Error('persistent commit failed');
        }

        completions.push(context);
      },
    },
    autopilot: {
      gameMinutesPerRealSecond: 2,
    },
  };

  return {
    dependencies,
    narrativeEvents,
    completions,
  };
}

describe('PassengerRideOrchestrator', () => {
  it('runs assignment, pickup, dialogue, route event, arrival, and committed drop-off', () => {
    const harness = createHarness();
    const passengerId = entityId('passenger', 'routine-rider');
    const ride = PassengerRideOrchestrator.acceptJob(
      createJob(passengerId),
      entityId('ride', 'routine-rider-night'),
      acceptedAt,
      harness.dependencies,
    );

    expect(ride.getPresentation()).toMatchObject({
      phase: 'assigned',
      passenger: {
        id: passengerId,
        lifecycleKind: 'routine',
      },
      dialogue: null,
      canDropOff: false,
    });
    expect(ride.getRideContract().status).toBe('accepted');

    const pickup = ride.pickup(pickupAt);

    expect(pickup.phase).toBe('active');
    expect(pickup.performanceCue).toBe('guarded');
    expect(pickup.dialogue?.choices).toHaveLength(2);
    expect(ride.getRideContract()).toMatchObject({
      status: 'active',
      currentSegmentId: 'route-segment:docks-night-01',
      segmentProgress: 0,
    });
    expect(harness.narrativeEvents).toEqual([
      {
        type: 'knowledge.reveal',
        factId: 'fact:docks-checkpoint-rumor',
      },
    ]);

    const afterChoice = ride.chooseDialogue(0);
    expect(afterChoice.performanceCue).toBe('firm');
    expect(afterChoice.dialogue?.ended).toBe(true);
    expect(harness.narrativeEvents.at(-1)).toEqual({
      type: 'city-attention.adjust',
      delta: 1,
      reason: 'checkpoint-conversation',
    });

    const checkpoint = ride.advance(3);

    expect(checkpoint.consumedSeconds).toBeCloseTo(2.6);
    expect(checkpoint.events).toHaveLength(1);
    expect(checkpoint.presentation.pausedRouteEvent?.type).toBe(
      'route.checkpoint',
    );
    expect(checkpoint.presentation.routeProgress).toBeCloseTo(0.65);

    ride.resolveRouteEvent({ type: 'continue' });
    const arrived = ride.advance(1.4);

    expect(arrived.presentation.phase).toBe('dropoff-ready');
    expect(arrived.presentation.canDropOff).toBe(true);
    expect(arrived.presentation.routeProgress).toBe(1);

    const completed = ride.dropOff(completedAt);

    expect(completed.phase).toBe('completed');
    expect(completed.routeProgress).toBe(1);
    expect(ride.getRideContract()).toMatchObject({
      status: 'completed',
      routeId: 'route:docks-night',
      completedAt,
    });
    expect(harness.completions).toHaveLength(1);
    expect(harness.completions[0]).toMatchObject({
      ride: {
        status: 'completed',
        passengerId,
      },
      passenger: {
        id: passengerId,
      },
      emittedRouteEventIds: ['route-event:docks-checkpoint'],
      narrativeEnded: true,
    });

    expect(() => ride.dropOff(completedAt)).toThrow(
      /only be dropped off after route arrival/,
    );
  });

  it.each([
    ['routine-rider', 'routine'],
    ['recurring-rider', 'recurring'],
    ['story-rider', 'story'],
  ] as const)(
    'uses the same lifecycle for %s passenger content',
    (passengerSlug, lifecycleKind) => {
      const harness = createHarness();
      const passengerId = entityId('passenger', passengerSlug);
      const ride = PassengerRideOrchestrator.acceptJob(
        createJob(passengerId),
        entityId('ride', passengerSlug + '-night'),
        acceptedAt,
        harness.dependencies,
      );

      const presentation = ride.pickup(pickupAt);

      expect(presentation.phase).toBe('active');
      expect(presentation.passenger.lifecycleKind).toBe(lifecycleKind);
      expect(presentation.dialogue?.choices).toHaveLength(2);
    },
  );

  it('does not claim completion when persistent consequence commit fails', () => {
    const harness = createHarness({
      failCompletion: true,
    });
    const passengerId = entityId('passenger', 'routine-rider');
    const ride = PassengerRideOrchestrator.acceptJob(
      createJob(passengerId),
      entityId('ride', 'commit-failure'),
      acceptedAt,
      harness.dependencies,
    );

    ride.pickup(pickupAt);
    ride.advance(3);
    ride.resolveRouteEvent({ type: 'continue' });
    ride.advance(1.4);

    expect(ride.getPresentation().phase).toBe('dropoff-ready');
    expect(() => ride.dropOff(completedAt)).toThrow(
      /persistent commit failed/,
    );
    expect(ride.getPresentation().phase).toBe('dropoff-ready');
  });

  it('round-trips an active ride through the global versioned save without replaying prior narrative events', () => {
    const firstHarness = createHarness();
    const passengerId = entityId('passenger', 'recurring-rider');
    const original = PassengerRideOrchestrator.acceptJob(
      createJob(passengerId),
      entityId('ride', 'resume-night'),
      acceptedAt,
      firstHarness.dependencies,
    );

    original.pickup(pickupAt);
    const checkpoint = original.advance(3);

    expect(checkpoint.presentation.pausedRouteEvent?.type).toBe(
      'route.checkpoint',
    );
    expect(firstHarness.narrativeEvents).toEqual([
      {
        type: 'knowledge.reveal',
        factId: 'fact:docks-checkpoint-rumor',
      },
    ]);

    const state: GameState = {
      rideSession: original.getSessionSave(),
      socialState: null,
      translatorState: createInitialTranslatorState(),
      economyState: createInitialEconomyState(),
      radioState: createInitialRadioState(),
      personalSpaceState: createInitialPersonalSpaceState(),
      personalPersistenceState: createInitialPersonalPersistenceState(),
      relationshipState: createInitialRelationshipState(),
    };
    const serialized = gameSaveCodec.serialize(
      state,
      '2026-10-04T10:00:00.000Z',
    );
    const decoded = gameSaveCodec.deserialize(serialized);
    const secondHarness = createHarness();

    if (decoded.state.rideSession === null) {
      throw new Error('Expected a persisted ride session.');
    }

    const restored = PassengerRideOrchestrator.restore(
      decoded.state.rideSession,
      secondHarness.dependencies,
    );
    const restoredPresentation = restored.getPresentation();

    expect(restoredPresentation.phase).toBe('active');
    expect(restoredPresentation.performanceCue).toBe('guarded');
    expect(restoredPresentation.dialogue?.choices).toHaveLength(2);
    expect(restoredPresentation.pausedRouteEvent?.type).toBe(
      'route.checkpoint',
    );
    expect(restoredPresentation.routeProgress).toBeCloseTo(0.65);
    expect(secondHarness.narrativeEvents).toEqual([]);

    restored.chooseDialogue(0);

    expect(secondHarness.narrativeEvents).toEqual([
      {
        type: 'city-attention.adjust',
        delta: 1,
        reason: 'checkpoint-conversation',
      },
    ]);

    restored.resolveRouteEvent({ type: 'continue' });
    restored.advance(1.4);

    expect(restored.getPresentation().phase).toBe('dropoff-ready');
    restored.dropOff(completedAt);
    expect(secondHarness.completions).toHaveLength(1);
  });

  it('rejects an official job when the authoritative work eligibility context lacks its cover', () => {
    const harness = createHarness();
    const passengerId = entityId('passenger', 'routine-rider');
    const official = {
      ...createJob(passengerId),
      id: 'job:official-gated',
      source: {
        kind: 'official' as const,
        minimumOfficialStanding: 0,
        requiredCoverAttributes: [
          {
            key: 'work-permit',
            value: 'licensed-driver',
          },
        ],
      },
    };

    expect(() =>
      PassengerRideOrchestrator.acceptJob(
        official,
        entityId('ride', 'official-gated'),
        acceptedAt,
        harness.dependencies,
      ),
    ).toThrow(/cover:work-permit/);
  });

  it('rejects acceptance outside the authored job availability window', () => {
    const harness = createHarness();
    const passengerId = entityId('passenger', 'routine-rider');

    expect(() =>
      PassengerRideOrchestrator.acceptJob(
        createJob(passengerId),
        entityId('ride', 'too-early'),
        {
          day: 18,
          minuteOfDay: 19 * 60,
        },
        harness.dependencies,
      ),
    ).toThrow(/outside the job availability window/);
  });
});
