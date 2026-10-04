import * as z from 'zod';
import { entityIdSchema } from '../ids/EntityId';
import { gameMinuteIndex } from '../time/GameTime';
import {
  JobContractSchema,
  RideContractSchema,
  getUndergroundJobRiskSignal,
  type JobContract,
  type RideContract,
} from '../work/JobRideContracts';

export const ECONOMY_STATE_SCHEMA_VERSION = 1 as const;

const safeIntegerSchema = z
  .number()
  .int()
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Economy values must remain safe integers.',
  });

const nonNegativeSafeIntegerSchema = safeIntegerSchema.nonnegative();
const boundedProgressSchema = z.number().int().min(0).max(100);

export const EconomyStateSchema = z
  .object({
    schemaVersion: z.literal(ECONOMY_STATE_SCHEMA_VERSION),
    credits: safeIntegerSchema,
    lifetimeEarnedCredits: nonNegativeSafeIntegerSchema,
    lifetimeExpenseCredits: nonNegativeSafeIntegerSchema,
    officialStanding: boundedProgressSchema,
    undergroundAccess: boundedProgressSchema,
    settledRideIds: z.array(entityIdSchema('ride')),
  })
  .strict()
  .refine(
    (state) =>
      new Set(state.settledRideIds).size === state.settledRideIds.length,
    {
      message: 'Settled ride IDs must be unique.',
      path: ['settledRideIds'],
    },
  );

export type EconomyState = z.infer<typeof EconomyStateSchema>;

export interface RideEconomySettlement {
  readonly rideId: Extract<RideContract, { status: 'completed' }>['id'];
  readonly jobId: JobContract['id'];
  readonly durationMinutes: number;
  readonly grossFareCredits: number;
  readonly expenseCredits: number;
  readonly netCredits: number;
  readonly creditsAfter: number;
  readonly officialStandingAfter: number;
  readonly undergroundAccessAfter: number;
  readonly undergroundRisk: ReturnType<
    typeof getUndergroundJobRiskSignal
  >;
}

export function createInitialEconomyState(): EconomyState {
  return EconomyStateSchema.parse({
    schemaVersion: ECONOMY_STATE_SCHEMA_VERSION,
    credits: 0,
    lifetimeEarnedCredits: 0,
    lifetimeExpenseCredits: 0,
    officialStanding: 0,
    undergroundAccess: 0,
    settledRideIds: [],
  });
}

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function assertSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} exceeds safe-integer precision.`);
  }

  return value;
}

export class EconomyStateStore {
  #state: EconomyState;

  public constructor(stateInput: unknown = createInitialEconomyState()) {
    this.#state = EconomyStateSchema.parse(stateInput);
  }

  public exportState(): EconomyState {
    return EconomyStateSchema.parse(this.#state);
  }

  public getCredits(): number {
    return this.#state.credits;
  }

  public getOfficialStanding(): number {
    return this.#state.officialStanding;
  }

  public getUndergroundAccess(): number {
    return this.#state.undergroundAccess;
  }

  public spendCredits(amount: number): number {
    const validatedAmount = nonNegativeSafeIntegerSchema.parse(amount);

    if (this.#state.credits < validatedAmount) {
      throw new Error(
        `Insufficient credits: need ${String(validatedAmount)}, have ${String(this.#state.credits)}.`,
      );
    }

    this.#state = EconomyStateSchema.parse({
      ...this.#state,
      credits: assertSafeInteger(
        this.#state.credits - validatedAmount,
        'Credit balance',
      ),
      lifetimeExpenseCredits: assertSafeInteger(
        this.#state.lifetimeExpenseCredits + validatedAmount,
        'Lifetime expenses',
      ),
    });

    return this.#state.credits;
  }

  public settleCompletedRide(
    jobInput: unknown,
    rideInput: unknown,
  ): RideEconomySettlement {
    const job = JobContractSchema.parse(jobInput);
    const ride = RideContractSchema.parse(rideInput);

    if (ride.status !== 'completed') {
      throw new Error('Economy can settle only a completed ride.');
    }

    if (ride.jobId !== job.id) {
      throw new Error(
        `Ride ${ride.id} belongs to ${ride.jobId}, not ${job.id}.`,
      );
    }

    if (this.#state.settledRideIds.includes(ride.id)) {
      throw new Error(`Ride is already economically settled: ${ride.id}`);
    }

    const durationMinutes =
      gameMinuteIndex(ride.completedAt) -
      gameMinuteIndex(ride.startedAt);
    const grossFareCredits = assertSafeInteger(
      job.fare.baseCredits +
        job.fare.perMinuteCredits * durationMinutes +
        job.fare.completionBonusCredits,
      'Gross fare',
    );
    const expenseCredits = assertSafeInteger(
      job.expenses.dispatchFeeCredits +
        job.expenses.operatingCreditsPerMinute * durationMinutes,
      'Ride expenses',
    );
    const netCredits = assertSafeInteger(
      grossFareCredits - expenseCredits,
      'Net ride settlement',
    );
    const creditsAfter = assertSafeInteger(
      this.#state.credits + netCredits,
      'Credit balance',
    );
    const officialStandingAfter = clampProgress(
      this.#state.officialStanding +
        job.completionEffects.officialStandingDelta,
    );
    const undergroundAccessAfter = clampProgress(
      this.#state.undergroundAccess +
        job.completionEffects.undergroundAccessDelta,
    );

    this.#state = EconomyStateSchema.parse({
      ...this.#state,
      credits: creditsAfter,
      lifetimeEarnedCredits: assertSafeInteger(
        this.#state.lifetimeEarnedCredits + grossFareCredits,
        'Lifetime earnings',
      ),
      lifetimeExpenseCredits: assertSafeInteger(
        this.#state.lifetimeExpenseCredits + expenseCredits,
        'Lifetime expenses',
      ),
      officialStanding: officialStandingAfter,
      undergroundAccess: undergroundAccessAfter,
      settledRideIds: [...this.#state.settledRideIds, ride.id],
    });

    return {
      rideId: ride.id,
      jobId: job.id,
      durationMinutes,
      grossFareCredits,
      expenseCredits,
      netCredits,
      creditsAfter,
      officialStandingAfter,
      undergroundAccessAfter,
      undergroundRisk: getUndergroundJobRiskSignal(job),
    };
  }
}
