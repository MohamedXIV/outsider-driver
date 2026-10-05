import * as z from 'zod';
import { entityIdSchema } from '../../domain/ids/EntityId';
import type { PassengerCatalog } from './PassengerContracts';

export const PASSENGER_PERFORMANCE_CATALOG_SCHEMA_VERSION = 1 as const;

const stableTokenSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const parameterNameSchema = z.string().trim().min(1).max(160);

export const PassengerPerformanceChannelSchema = z.enum([
  'talk',
  'blink',
  'gaze',
  'head',
  'body',
]);

export type PassengerPerformanceChannel = z.infer<
  typeof PassengerPerformanceChannelSchema
>;

export const PerformanceInputSourceSchema = z.enum([
  'value',
  'x',
  'y',
]);

export type PerformanceInputSource = z.infer<
  typeof PerformanceInputSourceSchema
>;

export const PerformanceBindingComponentSchema = z
  .object({
    source: PerformanceInputSourceSchema,
    invert: z.boolean().default(false),
  })
  .strict();

export const PerformanceParameterBindingSchema = z
  .object({
    parameterName: parameterNameSchema,
    components: z
      .array(PerformanceBindingComponentSchema)
      .min(1)
      .max(4),
  })
  .strict();

export type PerformanceParameterBinding = z.infer<
  typeof PerformanceParameterBindingSchema
>;

function uniqueParameterNames(
  bindings: readonly PerformanceParameterBinding[],
): boolean {
  return (
    new Set(bindings.map((binding) => binding.parameterName)).size ===
    bindings.length
  );
}

function validateChannelSources(
  channel: PassengerPerformanceChannel,
  bindings: readonly PerformanceParameterBinding[],
  context: z.RefinementCtx,
): void {
  const allowed =
    channel === 'talk' || channel === 'blink'
      ? new Set<PerformanceInputSource>(['value'])
      : new Set<PerformanceInputSource>(['x', 'y']);

  bindings.forEach((binding, bindingIndex) => {
    binding.components.forEach((component, componentIndex) => {
      if (!allowed.has(component.source)) {
        context.addIssue({
          code: 'custom',
          message:
            `${channel} binding ${binding.parameterName} cannot read semantic source ${component.source}.`,
          path: [
            'channels',
            channel,
            bindingIndex,
            'components',
            componentIndex,
            'source',
          ],
        });
      }
    });
  });
}

const PerformanceChannelsSchema = z
  .object({
    talk: z.array(PerformanceParameterBindingSchema).default([]),
    blink: z.array(PerformanceParameterBindingSchema).default([]),
    gaze: z.array(PerformanceParameterBindingSchema).default([]),
    head: z.array(PerformanceParameterBindingSchema).default([]),
    body: z.array(PerformanceParameterBindingSchema).default([]),
  })
  .strict()
  .superRefine((channels, context) => {
    for (const channel of PassengerPerformanceChannelSchema.options) {
      const bindings = channels[channel];

      if (!uniqueParameterNames(bindings)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate puppet parameter in ${channel} bindings.`,
          path: [channel],
        });
      }

      validateChannelSources(channel, bindings, context);
    }
  });

export const PerformanceExpressionAssignmentSchema = z
  .object({
    parameterName: parameterNameSchema,
    normalizedValues: z
      .array(z.number().min(-1).max(1))
      .min(1)
      .max(4),
  })
  .strict();

export const PerformanceExpressionSchema = z
  .object({
    name: stableTokenSchema,
    assignments: z
      .array(PerformanceExpressionAssignmentSchema)
      .min(1),
  })
  .strict()
  .refine(
    (expression) =>
      new Set(
        expression.assignments.map(
          (assignment) => assignment.parameterName,
        ),
      ).size === expression.assignments.length,
    {
      message:
        'Expression assignments must target unique puppet parameters.',
      path: ['assignments'],
    },
  );

const UnitCueOperationSchema = z
  .object({
    channel: z.enum(['talk', 'blink']),
    values: z.tuple([z.number().min(0).max(1)]),
  })
  .strict();

const SignedCueOperationSchema = z
  .object({
    channel: z.enum(['gaze', 'head', 'body']),
    values: z.tuple([
      z.number().min(-1).max(1),
      z.number().min(-1).max(1),
    ]),
  })
  .strict();

export const PerformanceCueOperationSchema = z.union([
  UnitCueOperationSchema,
  SignedCueOperationSchema,
]);

export const PerformanceCueSchema = z
  .object({
    name: stableTokenSchema,
    expression: stableTokenSchema.nullable(),
    operations: z.array(PerformanceCueOperationSchema),
  })
  .strict();

export const PassengerPerformanceProfileSchema = z
  .object({
    passengerId: entityIdSchema('passenger'),
    channels: PerformanceChannelsSchema,
    expressions: z.array(PerformanceExpressionSchema),
    cues: z.array(PerformanceCueSchema),
  })
  .strict()
  .superRefine((profile, context) => {
    const expressionNames = new Set(
      profile.expressions.map((expression) => expression.name),
    );
    const cueNames = new Set(profile.cues.map((cue) => cue.name));

    if (expressionNames.size !== profile.expressions.length) {
      context.addIssue({
        code: 'custom',
        message: 'Performance expression names must be unique.',
        path: ['expressions'],
      });
    }

    if (cueNames.size !== profile.cues.length) {
      context.addIssue({
        code: 'custom',
        message: 'Performance cue names must be unique.',
        path: ['cues'],
      });
    }

    profile.cues.forEach((cue, cueIndex) => {
      if (
        cue.expression !== null &&
        !expressionNames.has(cue.expression)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            `Performance cue ${cue.name} references missing expression ${cue.expression}.`,
          path: ['cues', cueIndex, 'expression'],
        });
      }
    });
  });

export const PassengerPerformanceCatalogSchema = z
  .object({
    schemaVersion: z.literal(
      PASSENGER_PERFORMANCE_CATALOG_SCHEMA_VERSION,
    ),
    profiles: z.array(PassengerPerformanceProfileSchema),
  })
  .strict();

export type PassengerPerformanceProfile = z.infer<
  typeof PassengerPerformanceProfileSchema
>;
export type PassengerPerformanceCatalog = z.infer<
  typeof PassengerPerformanceCatalogSchema
>;
export type PerformanceCue = z.infer<typeof PerformanceCueSchema>;

export function validatePassengerPerformanceCatalog(
  input: unknown,
  passengers: PassengerCatalog,
): PassengerPerformanceCatalog {
  const catalog = PassengerPerformanceCatalogSchema.parse(input);
  const knownPassengerIds = new Set(
    passengers.passengers.map((passenger) => passenger.id),
  );
  const profilePassengerIds = new Set<string>();

  for (const profile of catalog.profiles) {
    if (!knownPassengerIds.has(profile.passengerId)) {
      throw new Error(
        `Passenger performance profile references unknown passenger: ${profile.passengerId}`,
      );
    }

    if (profilePassengerIds.has(profile.passengerId)) {
      throw new Error(
        `Duplicate passenger performance profile: ${profile.passengerId}`,
      );
    }

    profilePassengerIds.add(profile.passengerId);
  }

  return catalog;
}
