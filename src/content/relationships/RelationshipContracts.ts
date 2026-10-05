import * as z from 'zod';
import { entityIdSchema } from '../../domain/ids/EntityId';
import {
  MINUTES_PER_DAY,
} from '../../domain/time/GameTime';
import {
  validatePassengerCatalog,
  type PassengerCatalog,
} from '../passengers/PassengerContracts';

export const RELATIONSHIP_CATALOG_SCHEMA_VERSION = 1 as const;

const relationshipValueSchema = z.number().min(0).max(100);
const humanAttitudeSchema = z.number().min(-100).max(100);
const safeNonNegativeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Relationship scheduling values must be safe integers.',
  });

export const RelationshipDimensionSchema = z.enum([
  'trust',
  'affection',
]);

export type RelationshipDimension = z.infer<
  typeof RelationshipDimensionSchema
>;

export const RelationshipMetricConfigSchema = z
  .object({
    initialValue: relationshipValueSchema,
  })
  .strict();

export const RecurringDailyWindowSchema = z
  .object({
    startMinuteOfDay: z
      .number()
      .int()
      .min(0)
      .max(MINUTES_PER_DAY - 1),
    endMinuteOfDay: z
      .number()
      .int()
      .min(1)
      .max(MINUTES_PER_DAY),
  })
  .strict()
  .refine(
    (window) => window.startMinuteOfDay < window.endMinuteOfDay,
    {
      message:
        'Recurring passenger daily window must end after it starts; split overnight windows into separate authored availability.',
      path: ['endMinuteOfDay'],
    },
  );

export const RecurringPassengerPolicySchema = z
  .object({
    minimumCompletedRides: safeNonNegativeIntegerSchema,
    cooldownMinutes: safeNonNegativeIntegerSchema,
    dailyWindow: RecurringDailyWindowSchema.optional(),
    requiredFactIds: z.array(entityIdSchema('fact')),
    forbiddenFactIds: z.array(entityIdSchema('fact')),
    minimumTrust: relationshipValueSchema.optional(),
    minimumAffection: relationshipValueSchema.optional(),
    minimumHumanAttitude: humanAttitudeSchema.optional(),
    maximumHumanAttitude: humanAttitudeSchema.optional(),
  })
  .strict()
  .superRefine((policy, context) => {
    if (
      new Set(policy.requiredFactIds).size !==
      policy.requiredFactIds.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Recurring required fact IDs must be unique.',
        path: ['requiredFactIds'],
      });
    }

    if (
      new Set(policy.forbiddenFactIds).size !==
      policy.forbiddenFactIds.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Recurring forbidden fact IDs must be unique.',
        path: ['forbiddenFactIds'],
      });
    }

    const forbidden = new Set(policy.forbiddenFactIds);

    for (const factId of policy.requiredFactIds) {
      if (forbidden.has(factId)) {
        context.addIssue({
          code: 'custom',
          message:
            'A recurring passenger fact cannot be both required and forbidden.',
          path: ['requiredFactIds'],
        });
      }
    }

    if (
      policy.minimumHumanAttitude !== undefined &&
      policy.maximumHumanAttitude !== undefined &&
      policy.minimumHumanAttitude > policy.maximumHumanAttitude
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Minimum human attitude cannot exceed maximum human attitude.',
        path: ['maximumHumanAttitude'],
      });
    }
  });

export const PassengerRelationshipProfileSchema = z
  .object({
    passengerId: entityIdSchema('passenger'),
    trust: RelationshipMetricConfigSchema.optional(),
    affection: RelationshipMetricConfigSchema.optional(),
    initialHumanAttitude: humanAttitudeSchema,
    recurrence: RecurringPassengerPolicySchema.optional(),
  })
  .strict();

export const RelationshipCatalogSchema = z
  .object({
    schemaVersion: z.literal(RELATIONSHIP_CATALOG_SCHEMA_VERSION),
    profiles: z.array(PassengerRelationshipProfileSchema),
  })
  .strict();

export type PassengerRelationshipProfile = z.infer<
  typeof PassengerRelationshipProfileSchema
>;
export type RelationshipCatalog = z.infer<
  typeof RelationshipCatalogSchema
>;
export type RecurringPassengerPolicy = z.infer<
  typeof RecurringPassengerPolicySchema
>;

export function validateRelationshipCatalog(
  input: unknown,
  passengersInput: unknown,
): RelationshipCatalog {
  const catalog = RelationshipCatalogSchema.parse(input);
  const passengers: PassengerCatalog =
    validatePassengerCatalog(passengersInput);
  const passengerById = new Map(
    passengers.passengers.map((passenger) => [
      passenger.id,
      passenger,
    ]),
  );
  const seenPassengerIds = new Set<string>();

  for (const profile of catalog.profiles) {
    if (seenPassengerIds.has(profile.passengerId)) {
      throw new Error(
        `Duplicate relationship profile for ${profile.passengerId}`,
      );
    }

    seenPassengerIds.add(profile.passengerId);
    const passenger = passengerById.get(profile.passengerId);

    if (passenger === undefined) {
      throw new Error(
        `Relationship profile references unknown passenger ${profile.passengerId}`,
      );
    }

    if (
      passenger.data.lifecycleKind === 'recurring' &&
      profile.recurrence === undefined
    ) {
      throw new Error(
        `Recurring passenger ${profile.passengerId} requires an authored recurrence policy.`,
      );
    }

    if (
      passenger.data.lifecycleKind !== 'recurring' &&
      profile.recurrence !== undefined
    ) {
      throw new Error(
        `Only recurring passengers may define recurrence policy: ${profile.passengerId}`,
      );
    }

    if (
      profile.recurrence?.minimumTrust !== undefined &&
      profile.trust === undefined
    ) {
      throw new Error(
        `Recurring passenger ${profile.passengerId} gates on trust but does not enable the trust dimension.`,
      );
    }

    if (
      profile.recurrence?.minimumAffection !== undefined &&
      profile.affection === undefined
    ) {
      throw new Error(
        `Recurring passenger ${profile.passengerId} gates on affection but does not enable the affection dimension.`,
      );
    }
  }

  return catalog;
}
