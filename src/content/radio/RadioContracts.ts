import * as z from 'zod';
import { entityIdSchema } from '../../domain/ids/EntityId';
import {
  GameTimeSchema,
  GameTimeWindowSchema,
} from '../../domain/time/GameTime';
import {
  TranslationRegisterSchema,
  TranslationVocabularyKeySchema,
  validateTranslatorCatalog,
  type TranslatorCatalog,
} from '../translator/TranslatorContracts';
import {
  validateWorldContentCatalog,
  type WorldContentCatalog,
} from '../world/WorldContracts';
import type { JobContract } from '../../domain/work/JobRideContracts';
import type { PassengerCatalog } from '../passengers/PassengerContracts';
import { createContentDocumentSchema } from '../schema/ContentDocument';
import { validateContentGraph } from '../validation/ContentGraph';

export const RADIO_CATALOG_SCHEMA_VERSION = 1 as const;

const displayNameSchema = z.string().trim().min(1).max(120);
const stableKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const BroadcastContentTypeSchema = z.enum([
  'music',
  'talk',
  'news',
  'traffic',
  'underground',
]);

export type BroadcastContentType = z.infer<
  typeof BroadcastContentTypeSchema
>;

export const RadioStationDataSchema = z
  .object({
    displayName: displayNameSchema,
    frequencyLabel: z.string().trim().min(1).max(40),
    defaultLanguageId: entityIdSchema('language'),
    discoverability: z.enum(['public', 'hidden']),
  })
  .strict();

export const RadioStationDocumentSchema = createContentDocumentSchema(
  'radio-station',
  RadioStationDataSchema,
);

const DailyBroadcastScheduleSchema = z
  .object({
    type: z.literal('daily'),
    startMinuteOfDay: z.number().int().min(0).max(24 * 60 - 1),
    endMinuteOfDay: z.number().int().min(1).max(24 * 60),
  })
  .strict()
  .refine(
    (schedule) =>
      schedule.startMinuteOfDay < schedule.endMinuteOfDay,
    {
      message:
        'Daily radio schedule must end after it starts; split overnight programming into two authored windows.',
      path: ['endMinuteOfDay'],
    },
  );

const AbsoluteBroadcastScheduleSchema = z
  .object({
    type: z.literal('absolute'),
    window: GameTimeWindowSchema,
  })
  .strict();

export const BroadcastScheduleSchema = z.discriminatedUnion('type', [
  DailyBroadcastScheduleSchema,
  AbsoluteBroadcastScheduleSchema,
]);

const FactInformationHookSchema = z
  .object({
    type: z.literal('fact'),
    factId: entityIdSchema('fact'),
    minimumComprehension: z.number().int().min(0).max(3),
  })
  .strict();

const RouteInformationHookSchema = z
  .object({
    type: z.literal('route-intel'),
    factId: entityIdSchema('fact'),
    routeId: entityIdSchema('route'),
    minimumComprehension: z.number().int().min(0).max(3),
  })
  .strict();

const JobInformationHookSchema = z
  .object({
    type: z.literal('job-intel'),
    factId: entityIdSchema('fact'),
    jobId: entityIdSchema('job'),
    minimumComprehension: z.number().int().min(0).max(3),
  })
  .strict();

export const RadioInformationHookSchema = z.discriminatedUnion('type', [
  FactInformationHookSchema,
  RouteInformationHookSchema,
  JobInformationHookSchema,
]);

export const PassengerRadioReactionSchema = z
  .object({
    passengerId: entityIdSchema('passenger'),
    reactionKey: stableKeySchema,
  })
  .strict();

export const BroadcastDataSchema = z
  .object({
    stationId: entityIdSchema('radio-station'),
    contentType: BroadcastContentTypeSchema,
    contentKey: stableKeySchema,
    priority: z.number().int().min(-100).max(100),
    schedule: BroadcastScheduleSchema,
    languageId: entityIdSchema('language'),
    register: TranslationRegisterSchema,
    vocabularyKey: TranslationVocabularyKeySchema.nullable(),
    translationDifficulty: z.number().min(0).max(1),
    informationHooks: z.array(RadioInformationHookSchema),
    passengerReactions: z.array(PassengerRadioReactionSchema),
  })
  .strict()
  .refine(
    (broadcast) =>
      new Set(
        broadcast.passengerReactions.map(
          (reaction) => reaction.passengerId,
        ),
      ).size === broadcast.passengerReactions.length,
    {
      message:
        'A broadcast may define only one reaction per passenger.',
      path: ['passengerReactions'],
    },
  );

export const BroadcastDocumentSchema = createContentDocumentSchema(
  'broadcast',
  BroadcastDataSchema,
);

export const RadioCatalogSchema = z
  .object({
    schemaVersion: z.literal(RADIO_CATALOG_SCHEMA_VERSION),
    stations: z.array(RadioStationDocumentSchema),
    broadcasts: z.array(BroadcastDocumentSchema),
  })
  .strict();

export type RadioStationDocument = z.infer<
  typeof RadioStationDocumentSchema
>;
export type BroadcastDocument = z.infer<typeof BroadcastDocumentSchema>;
export type RadioCatalog = z.infer<typeof RadioCatalogSchema>;
export type RadioInformationHook = z.infer<
  typeof RadioInformationHookSchema
>;

function requireSemanticReferences(
  catalog: RadioCatalog,
  world: WorldContentCatalog,
  jobs: readonly JobContract[],
  passengers: PassengerCatalog,
): void {
  const routeIds = new Set(world.routes.map((route) => route.id));
  const jobIds = new Set(jobs.map((job) => job.id));
  const passengerIds = new Set(
    passengers.passengers.map((passenger) => passenger.id),
  );

  for (const broadcast of catalog.broadcasts) {
    for (const hook of broadcast.data.informationHooks) {
      if (hook.type === 'route-intel' && !routeIds.has(hook.routeId)) {
        throw new Error(
          `${broadcast.id} references unknown route intel target ${hook.routeId}`,
        );
      }

      if (hook.type === 'job-intel' && !jobIds.has(hook.jobId)) {
        throw new Error(
          `${broadcast.id} references unknown job intel target ${hook.jobId}`,
        );
      }
    }

    for (const reaction of broadcast.data.passengerReactions) {
      if (!passengerIds.has(reaction.passengerId)) {
        throw new Error(
          `${broadcast.id} references unknown reacting passenger ${reaction.passengerId}`,
        );
      }
    }
  }
}

export function validateRadioCatalog(
  input: unknown,
  translatorInput: unknown,
  worldInput: unknown,
  jobs: readonly JobContract[],
  passengers: PassengerCatalog,
): RadioCatalog {
  const catalog = RadioCatalogSchema.parse(input);
  const translator: TranslatorCatalog =
    validateTranslatorCatalog(translatorInput);
  const world = validateWorldContentCatalog(worldInput);

  validateContentGraph({
    schemaVersion: 1,
    nodes: [
      ...translator.languages.map((language) => ({
        id: language.id,
        references: [],
      })),
      ...catalog.stations.map((station) => ({
        id: station.id,
        references: [
          {
            id: station.data.defaultLanguageId,
            expectedKind: 'language' as const,
          },
        ],
      })),
      ...catalog.broadcasts.map((broadcast) => ({
        id: broadcast.id,
        references: [
          {
            id: broadcast.data.stationId,
            expectedKind: 'radio-station' as const,
          },
          {
            id: broadcast.data.languageId,
            expectedKind: 'language' as const,
          },
        ],
      })),
    ],
  });

  requireSemanticReferences(catalog, world, jobs, passengers);
  return catalog;
}

export function isBroadcastScheduledAt(
  broadcast: BroadcastDocument,
  timeInput: unknown,
): boolean {
  const time = GameTimeSchema.parse(timeInput);
  const schedule = broadcast.data.schedule;

  if (schedule.type === 'daily') {
    return (
      time.minuteOfDay >= schedule.startMinuteOfDay &&
      time.minuteOfDay < schedule.endMinuteOfDay
    );
  }

  const opensAt = schedule.window.opensAt;
  const closesAt = schedule.window.closesAt;
  const absoluteMinute = (time.day - 1) * 24 * 60 + time.minuteOfDay;
  const opensMinute =
    (opensAt.day - 1) * 24 * 60 + opensAt.minuteOfDay;
  const closesMinute =
    (closesAt.day - 1) * 24 * 60 + closesAt.minuteOfDay;

  return absoluteMinute >= opensMinute && absoluteMinute <= closesMinute;
}
