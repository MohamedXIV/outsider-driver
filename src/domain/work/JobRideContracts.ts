import * as z from 'zod';
import type {
  PassengerId,
  RouteId,
  RouteSegmentId,
} from '../ids/EntityId';
import { entityIdSchema } from '../ids/EntityId';
import {
  ClaimValueSchema,
  SocialKeySchema,
} from '../social/SocialStealthState';
import {
  GameTimeSchema,
  GameTimeWindowSchema,
  compareGameTime,
} from '../time/GameTime';
import {
  validateWorldContentCatalog,
  type WorldContentCatalog,
} from '../../content/world/WorldContracts';

export const PassengerReferenceSchema = entityIdSchema('passenger');

const boundedProgressSchema = z.number().int().min(0).max(100);
const creditAmountSchema = z.number().int().nonnegative();

export const WorkIdentityRequirementSchema = z
  .object({
    key: SocialKeySchema,
    value: ClaimValueSchema,
  })
  .strict();

const OfficialJobSourceSchema = z
  .object({
    kind: z.literal('official'),
    minimumOfficialStanding: boundedProgressSchema,
    requiredCoverAttributes: z.array(WorkIdentityRequirementSchema),
  })
  .strict()
  .refine(
    (source) =>
      new Set(
        source.requiredCoverAttributes.map((requirement) => requirement.key),
      ).size === source.requiredCoverAttributes.length,
    {
      message: 'Official identity requirement keys must be unique.',
      path: ['requiredCoverAttributes'],
    },
  );

const UndergroundJobSourceSchema = z
  .object({
    kind: z.literal('underground'),
    minimumUndergroundAccess: boundedProgressSchema,
    riskFootprint: z.number().min(0).max(100),
  })
  .strict();

export const JobSourceSchema = z.discriminatedUnion('kind', [
  OfficialJobSourceSchema,
  UndergroundJobSourceSchema,
]);

export const FareTermsSchema = z
  .object({
    baseCredits: creditAmountSchema,
    perMinuteCredits: creditAmountSchema,
    completionBonusCredits: creditAmountSchema,
  })
  .strict();

export const ExpenseTermsSchema = z
  .object({
    dispatchFeeCredits: creditAmountSchema,
    operatingCreditsPerMinute: creditAmountSchema,
  })
  .strict();

export const WorkCompletionEffectsSchema = z
  .object({
    officialStandingDelta: z.number().int().min(-100).max(100),
    undergroundAccessDelta: z.number().int().min(-100).max(100),
  })
  .strict();

const workCapabilitySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const WorkPersonalRequirementsSchema = z
  .object({
    minimumTaxiCondition: z.number().int().min(0).max(100),
    requiredTaxiCapabilities: z.array(workCapabilitySchema),
    requiredItemIds: z.array(entityIdSchema('item')),
  })
  .strict();

export const JobContractSchema = z
  .object({
    id: entityIdSchema('job'),
    passengerId: PassengerReferenceSchema,
    pickupLocationId: entityIdSchema('location'),
    destinationLocationId: entityIdSchema('location'),
    routeId: entityIdSchema('route'),
    availability: GameTimeWindowSchema,
    source: JobSourceSchema,
    fare: FareTermsSchema,
    expenses: ExpenseTermsSchema,
    completionEffects: WorkCompletionEffectsSchema,
    personalRequirements: WorkPersonalRequirementsSchema.optional(),
  })
  .strict();

export type JobContract = z.infer<typeof JobContractSchema>;
export type WorkIdentityRequirement = z.infer<
  typeof WorkIdentityRequirementSchema
>;

export interface WorkEligibilityContext {
  readonly officialStanding: number;
  readonly undergroundAccess: number;
  readonly taxiCondition?: number;
  coverIdentityMatches(key: string, value: string): boolean;
  hasTaxiCapability?(capability: string): boolean;
  hasItem?(itemId: string): boolean;
}

export interface WorkEligibilityResult {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
}

export interface UndergroundJobRiskSignal {
  readonly jobId: JobContract['id'];
  readonly source: 'underground';
  readonly riskFootprint: number;
}

export function evaluateJobEligibility(
  jobInput: unknown,
  context: WorkEligibilityContext,
): WorkEligibilityResult {
  const job = JobContractSchema.parse(jobInput);
  const reasons: string[] = [];

  if (job.source.kind === 'official') {
    if (
      context.officialStanding <
      job.source.minimumOfficialStanding
    ) {
      reasons.push('official-standing');
    }

    for (const requirement of job.source.requiredCoverAttributes) {
      if (
        !context.coverIdentityMatches(
          requirement.key,
          requirement.value,
        )
      ) {
        reasons.push(`cover:${requirement.key}`);
      }
    }
  } else if (
    context.undergroundAccess <
    job.source.minimumUndergroundAccess
  ) {
    reasons.push('underground-access');
  }

  const personal = job.personalRequirements;

  if (personal !== undefined) {
    if (
      context.taxiCondition === undefined ||
      context.taxiCondition < personal.minimumTaxiCondition
    ) {
      reasons.push('taxi-condition');
    }

    for (const capability of personal.requiredTaxiCapabilities) {
      if (context.hasTaxiCapability?.(capability) !== true) {
        reasons.push(`taxi-capability:${capability}`);
      }
    }

    for (const itemId of personal.requiredItemIds) {
      if (context.hasItem?.(itemId) !== true) {
        reasons.push(`item:${itemId}`);
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export function requireJobEligibility(
  jobInput: unknown,
  context: WorkEligibilityContext,
): JobContract {
  const job = JobContractSchema.parse(jobInput);
  const eligibility = evaluateJobEligibility(job, context);

  if (!eligibility.eligible) {
    throw new Error(
      `Job ${job.id} is not eligible: ${eligibility.reasons.join(', ')}`,
    );
  }

  return job;
}

export function getUndergroundJobRiskSignal(
  jobInput: unknown,
): UndergroundJobRiskSignal | null {
  const job = JobContractSchema.parse(jobInput);

  if (job.source.kind !== 'underground') {
    return null;
  }

  return {
    jobId: job.id,
    source: 'underground',
    riskFootprint: job.source.riskFootprint,
  };
}

const RideBaseSchema = z
  .object({
    id: entityIdSchema('ride'),
    jobId: entityIdSchema('job'),
    passengerId: PassengerReferenceSchema,
    pickupLocationId: entityIdSchema('location'),
    destinationLocationId: entityIdSchema('location'),
    routeId: entityIdSchema('route'),
    acceptedAt: GameTimeSchema,
  })
  .strict();

const AcceptedRideSchema = RideBaseSchema.extend({
  status: z.literal('accepted'),
});

const ActiveRideSchema = RideBaseSchema.extend({
  status: z.literal('active'),
  startedAt: GameTimeSchema,
  currentSegmentId: entityIdSchema('route-segment'),
  segmentProgress: z.number().min(0).max(1),
}).refine(
  (ride) => compareGameTime(ride.acceptedAt, ride.startedAt) <= 0,
  {
    message: 'A ride cannot start before it is accepted.',
    path: ['startedAt'],
  },
);

const CompletedRideSchema = RideBaseSchema.extend({
  status: z.literal('completed'),
  startedAt: GameTimeSchema,
  completedAt: GameTimeSchema,
})
  .refine(
    (ride) => compareGameTime(ride.acceptedAt, ride.startedAt) <= 0,
    {
      message: 'A ride cannot start before it is accepted.',
      path: ['startedAt'],
    },
  )
  .refine(
    (ride) => compareGameTime(ride.startedAt, ride.completedAt) <= 0,
    {
      message: 'A ride cannot complete before it starts.',
      path: ['completedAt'],
    },
  );

const CancelledRideSchema = RideBaseSchema.extend({
  status: z.literal('cancelled'),
  cancelledAt: GameTimeSchema,
}).refine(
  (ride) => compareGameTime(ride.acceptedAt, ride.cancelledAt) <= 0,
  {
    message: 'A ride cannot be cancelled before it is accepted.',
    path: ['cancelledAt'],
  },
);

export const RideContractSchema = z.discriminatedUnion('status', [
  AcceptedRideSchema,
  ActiveRideSchema,
  CompletedRideSchema,
  CancelledRideSchema,
]);

export type RideContract = z.infer<typeof RideContractSchema>;

export class WorkReferenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'WorkReferenceError';
  }
}

function requirePassenger(
  passengerId: PassengerId,
  knownPassengerIds: ReadonlySet<PassengerId>,
): void {
  if (!knownPassengerIds.has(passengerId)) {
    throw new WorkReferenceError(
      `Unknown passenger reference: ${passengerId}`,
    );
  }
}

function requireRouteAndLocations(
  routeId: RouteId,
  pickupLocationId: JobContract['pickupLocationId'],
  destinationLocationId: JobContract['destinationLocationId'],
  catalog: WorldContentCatalog,
): void {
  const locationIds = new Set(catalog.locations.map((location) => location.id));

  if (!locationIds.has(pickupLocationId)) {
    throw new WorkReferenceError(
      `Unknown pickup location: ${pickupLocationId}`,
    );
  }

  if (!locationIds.has(destinationLocationId)) {
    throw new WorkReferenceError(
      `Unknown destination location: ${destinationLocationId}`,
    );
  }

  const route = catalog.routes.find((candidate) => candidate.id === routeId);

  if (route === undefined) {
    throw new WorkReferenceError(`Unknown route: ${routeId}`);
  }

  if (
    route.data.originLocationId !== pickupLocationId ||
    route.data.destinationLocationId !== destinationLocationId
  ) {
    throw new WorkReferenceError(
      `Route ${routeId} endpoints do not match the work contract.`,
    );
  }
}

function requireRouteSegment(
  routeId: RouteId,
  segmentId: RouteSegmentId,
  catalog: WorldContentCatalog,
): void {
  const route = catalog.routes.find((candidate) => candidate.id === routeId);

  if (!route?.data.segmentIds.includes(segmentId)) {
    throw new WorkReferenceError(
      `Route segment ${segmentId} does not belong to route ${routeId}.`,
    );
  }
}

export function validateJobReferences(
  input: unknown,
  worldInput: unknown,
  knownPassengerIds: ReadonlySet<PassengerId>,
): JobContract {
  const job = JobContractSchema.parse(input);
  const catalog = validateWorldContentCatalog(worldInput);

  requirePassenger(job.passengerId, knownPassengerIds);
  requireRouteAndLocations(
    job.routeId,
    job.pickupLocationId,
    job.destinationLocationId,
    catalog,
  );

  return job;
}

export function validateRideReferences(
  input: unknown,
  worldInput: unknown,
  knownPassengerIds: ReadonlySet<PassengerId>,
): RideContract {
  const ride = RideContractSchema.parse(input);
  const catalog = validateWorldContentCatalog(worldInput);

  requirePassenger(ride.passengerId, knownPassengerIds);
  requireRouteAndLocations(
    ride.routeId,
    ride.pickupLocationId,
    ride.destinationLocationId,
    catalog,
  );

  if (ride.status === 'active') {
    requireRouteSegment(ride.routeId, ride.currentSegmentId, catalog);
  }

  return ride;
}
