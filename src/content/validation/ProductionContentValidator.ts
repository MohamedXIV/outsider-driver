import * as z from 'zod';
import {
  validatePassengerCatalog,
  type PassengerCatalog,
} from '../passengers/PassengerContracts';
import {
  validatePassengerPerformanceCatalog,
  type PassengerPerformanceCatalog,
} from '../passengers/PassengerPerformanceContracts';
import {
  validateRelationshipCatalog,
  type RelationshipCatalog,
} from '../relationships/RelationshipContracts';
import {
  validateRouteExperienceCatalog,
  type RouteExperienceCatalog,
} from '../routes/RouteExperienceContracts';
import {
  validateRouteMotionCatalog,
  type RouteMotionCatalog,
} from '../routes/RouteMotionProfiles';
import {
  TaxiSceneDefinitionSchema,
  type TaxiSceneDefinition,
} from '../presentation/TaxiSceneDefinition';
import {
  validateWorldContentCatalog,
  type WorldContentCatalog,
} from '../world/WorldContracts';
import {
  validateTranslatorCatalog,
  type TranslatorCatalog,
} from '../translator/TranslatorContracts';
import {
  validateRadioCatalog,
  type RadioCatalog,
} from '../radio/RadioContracts';
import {
  validatePersonalSpaceCatalog,
  type PersonalSpaceCatalog,
} from '../spaces/PersonalSpaceContracts';
import {
  validatePersonalPersistenceCatalog,
  type PersonalPersistenceCatalog,
} from '../personal/PersonalPersistenceContracts';
import {
  JobContractSchema,
  validateJobReferences,
  type JobContract,
} from '../../domain/work/JobRideContracts';
import type { PassengerId } from '../../domain/ids/EntityId';
import {
  compileInkSource,
  type CompiledInkStory,
} from '../../narrative/compileInkSource';
import {
  createInitialGameState,
  gameSaveCodec,
} from '../../persistence/save/gameSave';

const narrativeStoryIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const performanceCueNameSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const performanceCueTagRegex = /#\s*performance:([^\s#]*)/g;

const NarrativeStorySourceSchema = z
  .object({
    id: narrativeStoryIdSchema,
    source: z.string().min(1),
  })
  .strict();

export interface ProductionContentBundleInput {
  readonly world: unknown;
  readonly passengers: unknown;
  readonly passengerPerformance: unknown;
  readonly relationships: unknown;
  readonly jobs: readonly unknown[];
  readonly routeMotion: unknown;
  readonly routeExperience: unknown;
  readonly translator: unknown;
  readonly radio: unknown;
  readonly personalSpaces: unknown;
  readonly personalPersistence: unknown;
  readonly narrativeStories: readonly unknown[];
  readonly taxiScene: unknown;
}

export interface ProductionContentValidationIssue {
  readonly scope: string;
  readonly message: string;
}

export class ProductionContentValidationError extends Error {
  public readonly issues: readonly ProductionContentValidationIssue[];

  public constructor(issues: readonly ProductionContentValidationIssue[]) {
    super(
      issues
        .map((issue) => `[${issue.scope}] ${issue.message}`)
        .join('\n'),
    );
    this.name = 'ProductionContentValidationError';
    this.issues = issues;
  }
}

export interface ValidatedNarrativeStory {
  readonly id: string;
  readonly source: string;
  readonly compiled: CompiledInkStory;
}

export interface ValidatedProductionContent {
  readonly world: WorldContentCatalog;
  readonly passengers: PassengerCatalog;
  readonly passengerPerformance: PassengerPerformanceCatalog;
  readonly relationships: RelationshipCatalog;
  readonly jobs: readonly JobContract[];
  readonly routeMotion: RouteMotionCatalog;
  readonly routeExperience: RouteExperienceCatalog;
  readonly translator: TranslatorCatalog;
  readonly radio: RadioCatalog;
  readonly personalSpaces: PersonalSpaceCatalog;
  readonly personalPersistence: PersonalPersistenceCatalog;
  readonly narrativeStories: readonly ValidatedNarrativeStory[];
  readonly taxiScene: TaxiSceneDefinition;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function addIssue(
  issues: ProductionContentValidationIssue[],
  scope: string,
  error: unknown,
): void {
  issues.push({
    scope,
    message: errorMessage(error),
  });
}

function requireNoDuplicateNarrativeIds(
  stories: readonly { readonly id: string }[],
): void {
  const seen = new Set<string>();

  for (const story of stories) {
    if (seen.has(story.id)) {
      throw new Error(`Duplicate narrative story ID: ${story.id}`);
    }

    seen.add(story.id);
  }
}

function requirePassengerNarratives(
  passengers: PassengerCatalog,
  stories: readonly ValidatedNarrativeStory[],
): void {
  const storyIds = new Set(stories.map((story) => story.id));

  for (const passenger of passengers.passengers) {
    if (!storyIds.has(passenger.data.narrativeStoryId)) {
      throw new Error(
        `${passenger.id} references missing narrative story ${passenger.data.narrativeStoryId}`,
      );
    }
  }
}

function performanceCueNames(source: string): readonly string[] {
  return [...source.matchAll(performanceCueTagRegex)].map((match) =>
    performanceCueNameSchema.parse(match[1] ?? ''),
  );
}

function requirePassengerPerformanceNarrativeCues(
  passengers: PassengerCatalog,
  performance: PassengerPerformanceCatalog,
  stories: readonly ValidatedNarrativeStory[],
): void {
  const storyById = new Map(
    stories.map((story) => [story.id, story]),
  );
  const profileByPassengerId = new Map(
    performance.profiles.map((profile) => [
      profile.passengerId,
      profile,
    ]),
  );

  for (const passenger of passengers.passengers) {
    const story = storyById.get(passenger.data.narrativeStoryId);

    if (story === undefined) {
      continue;
    }

    const requestedCues = performanceCueNames(story.source);

    if (requestedCues.length === 0) {
      continue;
    }

    const profile = profileByPassengerId.get(passenger.id);

    if (profile === undefined) {
      throw new Error(
        `${passenger.id} narrative requests performance cues but has no performance profile.`,
      );
    }

    const knownCueNames = new Set(
      profile.cues.map((cue) => cue.name),
    );

    for (const cueName of requestedCues) {
      if (!knownCueNames.has(cueName)) {
        throw new Error(
          `${passenger.id} narrative requests missing performance cue ${cueName}.`,
        );
      }
    }
  }
}

function requireReachableRouteStructure(world: WorldContentCatalog): void {
  const usedSegmentIds = new Set(
    world.routes.flatMap((route) => route.data.segmentIds),
  );
  const usedEventIds = new Set(
    world.routeSegments.flatMap((segment) => segment.data.eventIds),
  );

  for (const segment of world.routeSegments) {
    if (!usedSegmentIds.has(segment.id)) {
      throw new Error(
        `Unreachable route segment is not used by any route: ${segment.id}`,
      );
    }
  }

  for (const event of world.routeEvents) {
    if (!usedEventIds.has(event.id)) {
      throw new Error(
        `Unreachable route event is not used by any segment: ${event.id}`,
      );
    }
  }
}

function validateJobs(
  jobsInput: readonly unknown[],
  world: WorldContentCatalog,
  passengers: PassengerCatalog,
): readonly JobContract[] {
  const passengerIds = new Set<PassengerId>(
    passengers.passengers.map((passenger) => passenger.id),
  );
  const jobs = jobsInput.map((job) => JobContractSchema.parse(job));
  const jobIds = new Set<string>();

  for (const job of jobs) {
    if (jobIds.has(job.id)) {
      throw new Error(`Duplicate job ID: ${job.id}`);
    }

    jobIds.add(job.id);
    validateJobReferences(job, world, passengerIds);
  }

  return jobs;
}

function validateNarrativeStories(
  storiesInput: readonly unknown[],
): readonly ValidatedNarrativeStory[] {
  const stories = storiesInput.map((story) =>
    NarrativeStorySourceSchema.parse(story),
  );

  requireNoDuplicateNarrativeIds(stories);

  return stories.map((story) => ({
    ...story,
    compiled: compileInkSource(story.source),
  }));
}

export function validateProductionContent(
  input: ProductionContentBundleInput,
): ValidatedProductionContent {
  const issues: ProductionContentValidationIssue[] = [];
  let world: WorldContentCatalog | undefined;
  let passengers: PassengerCatalog | undefined;
  let passengerPerformance: PassengerPerformanceCatalog | undefined;
  let relationships: RelationshipCatalog | undefined;
  let jobs: readonly JobContract[] | undefined;
  let routeMotion: RouteMotionCatalog | undefined;
  let routeExperience: RouteExperienceCatalog | undefined;
  let translator: TranslatorCatalog | undefined;
  let radio: RadioCatalog | undefined;
  let personalSpaces: PersonalSpaceCatalog | undefined;
  let personalPersistence: PersonalPersistenceCatalog | undefined;
  let narrativeStories: readonly ValidatedNarrativeStory[] | undefined;
  let taxiScene: TaxiSceneDefinition | undefined;

  try {
    world = validateWorldContentCatalog(input.world);
    requireReachableRouteStructure(world);
  } catch (error: unknown) {
    addIssue(issues, 'world', error);
  }

  try {
    passengers = validatePassengerCatalog(input.passengers);
  } catch (error: unknown) {
    addIssue(issues, 'passengers', error);
  }

  if (passengers !== undefined) {
    try {
      relationships = validateRelationshipCatalog(
        input.relationships,
        passengers,
      );
    } catch (error: unknown) {
      addIssue(issues, 'relationships', error);
    }

    try {
      passengerPerformance = validatePassengerPerformanceCatalog(
        input.passengerPerformance,
        passengers,
      );
    } catch (error: unknown) {
      addIssue(issues, 'passenger-performance', error);
    }
  }

  try {
    translator = validateTranslatorCatalog(input.translator);
  } catch (error: unknown) {
    addIssue(issues, 'translator', error);
  }

  try {
    personalSpaces = validatePersonalSpaceCatalog(
      input.personalSpaces,
    );
  } catch (error: unknown) {
    addIssue(issues, 'personal-spaces', error);
  }

  if (passengers !== undefined) {
    try {
      personalPersistence = validatePersonalPersistenceCatalog(
        input.personalPersistence,
        passengers,
      );
    } catch (error: unknown) {
      addIssue(issues, 'personal-persistence', error);
    }
  }

  try {
    narrativeStories = validateNarrativeStories(input.narrativeStories);
  } catch (error: unknown) {
    addIssue(issues, 'narrative', error);
  }

  try {
    taxiScene = TaxiSceneDefinitionSchema.parse(input.taxiScene);
  } catch (error: unknown) {
    addIssue(issues, 'taxi-scene', error);
  }

  if (world !== undefined) {
    try {
      routeMotion = validateRouteMotionCatalog(
        input.routeMotion,
        world,
      );
    } catch (error: unknown) {
      addIssue(issues, 'route-motion', error);
    }

    try {
      routeExperience = validateRouteExperienceCatalog(
        input.routeExperience,
        world,
      );
    } catch (error: unknown) {
      addIssue(issues, 'route-experience', error);
    }
  }

  if (world !== undefined && passengers !== undefined) {
    try {
      jobs = validateJobs(input.jobs, world, passengers);
    } catch (error: unknown) {
      addIssue(issues, 'jobs', error);
    }
  }

  if (
    world !== undefined &&
    passengers !== undefined &&
    jobs !== undefined &&
    translator !== undefined
  ) {
    try {
      radio = validateRadioCatalog(
        input.radio,
        translator,
        world,
        jobs,
        passengers,
      );
    } catch (error: unknown) {
      addIssue(issues, 'radio', error);
    }
  }

  if (passengers !== undefined && narrativeStories !== undefined) {
    try {
      requirePassengerNarratives(passengers, narrativeStories);
    } catch (error: unknown) {
      addIssue(issues, 'passenger-narrative', error);
    }
  }

  if (
    passengers !== undefined &&
    passengerPerformance !== undefined &&
    narrativeStories !== undefined
  ) {
    try {
      requirePassengerPerformanceNarrativeCues(
        passengers,
        passengerPerformance,
        narrativeStories,
      );
    } catch (error: unknown) {
      addIssue(
        issues,
        'passenger-performance-narrative',
        error,
      );
    }
  }

  try {
    const initialState = createInitialGameState();
    const envelope = gameSaveCodec.encode(
      initialState,
      '2000-01-01T00:00:00.000Z',
    );
    gameSaveCodec.decode(envelope);
  } catch (error: unknown) {
    addIssue(issues, 'save-contract', error);
  }

  if (issues.length > 0) {
    throw new ProductionContentValidationError(issues);
  }

  if (
    world === undefined ||
    passengers === undefined ||
    passengerPerformance === undefined ||
    relationships === undefined ||
    jobs === undefined ||
    routeMotion === undefined ||
    routeExperience === undefined ||
    translator === undefined ||
    radio === undefined ||
    personalSpaces === undefined ||
    personalPersistence === undefined ||
    narrativeStories === undefined ||
    taxiScene === undefined
  ) {
    throw new Error(
      'Production validation reached an impossible incomplete success state.',
    );
  }

  return {
    world,
    passengers,
    passengerPerformance,
    relationships,
    jobs,
    routeMotion,
    routeExperience,
    translator,
    radio,
    personalSpaces,
    personalPersistence,
    narrativeStories,
    taxiScene,
  };
}
