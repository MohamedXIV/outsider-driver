import * as z from 'zod';
import type {
  PassengerId,
  RouteId,
  RouteSegmentId,
} from '../ids/EntityId';
import { entityIdSchema } from '../ids/EntityId';
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

export const JobContractSchema = z
  .object({
    id: entityIdSchema('job'),
    passengerId: PassengerReferenceSchema,
    pickupLocationId: entityIdSchema('location'),
    destinationLocationId: entityIdSchema('location'),
    routeId: entityIdSchema('route'),
    availability: GameTimeWindowSchema,
  })
  .strict();

export type JobContract = z.infer<typeof JobContractSchema>;

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
});

const CompletedRideSchema = RideBaseSchema.extend({
  status: z.literal('completed'),
  startedAt: GameTimeSchema,
  completedAt: GameTimeSchema,
}).refine(
  (ride) => compareGameTime(ride.startedAt, ride.completedAt) <= 0,
  {
    message: 'A ride cannot complete before it starts.',
    path: ['completedAt'],
  },
);

const CancelledRideSchema = RideBaseSchema.extend({
  status: z.literal('cancelled'),
  cancelledAt: GameTimeSchema,
});

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

  if (route === undefined || !route.data.segmentIds.includes(segmentId)) {
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
