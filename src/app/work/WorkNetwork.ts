import {
  JobContractSchema,
  evaluateJobEligibility,
  type JobContract,
  type WorkEligibilityContext,
} from '../../domain/work/JobRideContracts';
import {
  compareGameTime,
  type GameTime,
} from '../../domain/time/GameTime';
import type { EconomyStateStore } from '../../domain/economy/EconomyState';
import type { SocialStealthStateStore } from '../../domain/social/SocialStealthState';
import type { PersonalPersistenceStateStore } from '../../domain/personal/PersonalPersistenceState';
import type { RelationshipStateStore } from '../../domain/relationships/RelationshipState';
import { entityIdSchema } from '../../domain/ids/EntityId';

export interface WorkNetworkEntry {
  readonly job: JobContract;
  readonly channel: JobContract['source']['kind'];
}

export interface WorkOfferEntry extends WorkNetworkEntry {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
}

export function createWorkEligibilityContext(
  economy: EconomyStateStore,
  social: SocialStealthStateStore | null,
  personal: PersonalPersistenceStateStore | null = null,
  relationships: RelationshipStateStore | null = null,
): WorkEligibilityContext {
  return {
    officialStanding: economy.getOfficialStanding(),
    undergroundAccess: economy.getUndergroundAccess(),
    ...(personal === null
      ? {}
      : {
          taxiCondition: personal.getTaxiCondition(),
        }),
    coverIdentityMatches: (key, value) =>
      social?.coverIdentityMatches(key, value) ?? false,
    hasTaxiCapability: (capability) =>
      personal?.hasTaxiCapability(capability) ?? false,
    hasItem: (itemId) =>
      personal?.hasItem(entityIdSchema('item').parse(itemId)) ?? false,
    getRelationshipMetric: (passengerId, dimension) => {
      if (relationships === null) {
        return null;
      }

      return relationships.hasDimension(passengerId, dimension)
        ? relationships.getMetric(passengerId, dimension)
        : null;
    },
    getHumanAttitude: (passengerId) =>
      relationships?.getHumanAttitude(passengerId) ?? null,
    getCompletedRideCount: (passengerId) =>
      relationships?.getCompletedRideCount(passengerId) ?? null,
  };
}

export class WorkNetwork {
  readonly #jobs: readonly JobContract[];

  public constructor(jobsInput: readonly unknown[]) {
    this.#jobs = jobsInput.map((job) => JobContractSchema.parse(job));
  }

  /**
   * Inspect all authored work with actual eligibility and scheduling reasons,
   * without granting access to offers the player cannot legally accept.
   */
  public listOffers(
    now: GameTime,
    context: WorkEligibilityContext,
  ): readonly WorkOfferEntry[] {
    return this.#jobs.map((job) => {
      const reasons = [...evaluateJobEligibility(job, context).reasons];
      if (compareGameTime(now, job.availability.opensAt) < 0) {
        reasons.unshift('availability:not-yet-open');
      } else if (compareGameTime(now, job.availability.closesAt) > 0) {
        reasons.unshift('availability:expired');
      }
      return {
        job,
        channel: job.source.kind,
        eligible: reasons.length === 0,
        reasons,
      };
    });
  }

  public listAvailable(
    now: GameTime,
    context: WorkEligibilityContext,
  ): readonly WorkNetworkEntry[] {
    return this.#jobs
      .filter(
        (job) =>
          compareGameTime(job.availability.opensAt, now) <= 0 &&
          compareGameTime(now, job.availability.closesAt) <= 0,
      )
      .filter((job) => evaluateJobEligibility(job, context).eligible)
      .map((job) => ({
        job,
        channel: job.source.kind,
      }));
  }

  public getJob(jobId: JobContract['id']): JobContract {
    const job = this.#jobs.find((candidate) => candidate.id === jobId);

    if (job === undefined) {
      throw new Error(`Unknown work-network job: ${jobId}`);
    }

    return job;
  }
}
