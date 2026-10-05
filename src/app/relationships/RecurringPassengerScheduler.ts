import {
  validateRelationshipCatalog,
  type RelationshipCatalog,
  type PassengerRelationshipProfile,
} from '../../content/relationships/RelationshipContracts';
import type { PassengerId } from '../../domain/ids/EntityId';
import type { RelationshipStateStore } from '../../domain/relationships/RelationshipState';
import type { SocialStealthStateStore } from '../../domain/social/SocialStealthState';
import {
  gameMinuteIndex,
  type GameTime,
} from '../../domain/time/GameTime';

export interface RecurringPassengerEligibility {
  readonly passengerId: PassengerId;
  readonly eligible: boolean;
  readonly reasons: readonly string[];
}

export class RecurringPassengerScheduler {
  readonly #catalog: RelationshipCatalog;
  readonly #relationships: RelationshipStateStore;
  readonly #social: SocialStealthStateStore;

  public constructor(
    relationshipCatalogInput: unknown,
    passengersInput: unknown,
    relationships: RelationshipStateStore,
    social: SocialStealthStateStore,
  ) {
    this.#catalog = validateRelationshipCatalog(
      relationshipCatalogInput,
      passengersInput,
    );
    this.#relationships = relationships;
    this.#social = social;
  }

  public evaluate(
    passengerId: PassengerId,
    now: GameTime,
  ): RecurringPassengerEligibility {
    const profile = this.#catalog.profiles.find(
      (candidate) => candidate.passengerId === passengerId,
    );

    if (profile?.recurrence === undefined) {
      return {
        passengerId,
        eligible: false,
        reasons: ['not-recurring'],
      };
    }

    const reasons: string[] = [];
    const policy = profile.recurrence;
    const completedRideCount =
      this.#relationships.getCompletedRideCount(passengerId);

    if (completedRideCount < policy.minimumCompletedRides) {
      reasons.push('completed-rides');
    }

    const lastCompletedAt =
      this.#relationships.getLastCompletedAt(passengerId);

    if (
      lastCompletedAt !== null &&
      gameMinuteIndex(now) - gameMinuteIndex(lastCompletedAt) <
        policy.cooldownMinutes
    ) {
      reasons.push('cooldown');
    }

    if (
      policy.dailyWindow !== undefined &&
      (
        now.minuteOfDay < policy.dailyWindow.startMinuteOfDay ||
        now.minuteOfDay >= policy.dailyWindow.endMinuteOfDay
      )
    ) {
      reasons.push('daily-window');
    }

    for (const factId of policy.requiredFactIds) {
      if (!this.#social.hasFact(factId)) {
        reasons.push(`fact-required:${factId}`);
      }
    }

    for (const factId of policy.forbiddenFactIds) {
      if (this.#social.hasFact(factId)) {
        reasons.push(`fact-forbidden:${factId}`);
      }
    }

    this.#evaluateRelationshipThresholds(
      profile,
      reasons,
    );

    return {
      passengerId,
      eligible: reasons.length === 0,
      reasons,
    };
  }

  public listEligible(now: GameTime): readonly PassengerId[] {
    return this.#catalog.profiles
      .filter((profile) => profile.recurrence !== undefined)
      .map((profile) => this.evaluate(profile.passengerId, now))
      .filter((result) => result.eligible)
      .map((result) => result.passengerId);
  }

  #evaluateRelationshipThresholds(
    profile: PassengerRelationshipProfile,
    reasons: string[],
  ): void {
    const policy = profile.recurrence;

    if (policy === undefined) {
      return;
    }

    if (
      policy.minimumTrust !== undefined &&
      this.#relationships.getMetric(
        profile.passengerId,
        'trust',
      ) < policy.minimumTrust
    ) {
      reasons.push('trust');
    }

    if (
      policy.minimumAffection !== undefined &&
      this.#relationships.getMetric(
        profile.passengerId,
        'affection',
      ) < policy.minimumAffection
    ) {
      reasons.push('affection');
    }

    const humanAttitude =
      this.#relationships.getHumanAttitude(profile.passengerId);

    if (
      policy.minimumHumanAttitude !== undefined &&
      humanAttitude < policy.minimumHumanAttitude
    ) {
      reasons.push('human-attitude-minimum');
    }

    if (
      policy.maximumHumanAttitude !== undefined &&
      humanAttitude > policy.maximumHumanAttitude
    ) {
      reasons.push('human-attitude-maximum');
    }
  }
}
