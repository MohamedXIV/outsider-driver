import * as z from 'zod';
import { entityIdSchema } from '../../domain/ids/EntityId';
import { GameTimeSchema } from '../../domain/time/GameTime';
import { NarrativeTurnSchema } from '../../narrative/contracts/NarrativePresentation';
import { RouteFlowStateSchema } from '../travel/RouteFlowController';

const narrativeStoryIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const RideSessionBaseSchema = z
  .object({
    rideId: entityIdSchema('ride'),
    jobId: entityIdSchema('job'),
    passengerId: entityIdSchema('passenger'),
    pickupLocationId: entityIdSchema('location'),
    destinationLocationId: entityIdSchema('location'),
    initialRouteId: entityIdSchema('route'),
    acceptedAt: GameTimeSchema,
    narrativeStoryId: narrativeStoryIdSchema,
  })
  .strict();

const AssignedRideSessionSchema = RideSessionBaseSchema.extend({
  phase: z.literal('assigned'),
});

const ActiveRideSessionFields = {
  startedAt: GameTimeSchema,
  routeFlow: RouteFlowStateSchema,
  narrativeStateJson: z.string().min(1),
  dialogue: NarrativeTurnSchema,
} as const;

const ActiveRideSessionSchema = RideSessionBaseSchema.extend({
  phase: z.literal('active'),
  ...ActiveRideSessionFields,
});

const DropoffReadyRideSessionSchema = RideSessionBaseSchema.extend({
  phase: z.literal('dropoff-ready'),
  ...ActiveRideSessionFields,
});

const CompletedRideSessionSchema = RideSessionBaseSchema.extend({
  phase: z.literal('completed'),
  startedAt: GameTimeSchema,
  completedAt: GameTimeSchema,
  finalRouteId: entityIdSchema('route'),
});

export const RideSessionSaveSchema = z.discriminatedUnion('phase', [
  AssignedRideSessionSchema,
  ActiveRideSessionSchema,
  DropoffReadyRideSessionSchema,
  CompletedRideSessionSchema,
]);

export type RideSessionSave = z.infer<typeof RideSessionSaveSchema>;
export type AssignedRideSession = z.infer<typeof AssignedRideSessionSchema>;
export type ActiveRideSession = z.infer<typeof ActiveRideSessionSchema>;
export type DropoffReadyRideSession = z.infer<
  typeof DropoffReadyRideSessionSchema
>;
export type CompletedRideSession = z.infer<typeof CompletedRideSessionSchema>;
