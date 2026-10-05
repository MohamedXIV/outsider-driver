import * as z from 'zod';
import {
  entityIdSchema,
  type PersonalSpaceId,
} from '../ids/EntityId';
import {
  validatePersonalSpaceCatalog,
  type PersonalSpaceCatalog,
  type PersonalSpaceDefinition,
} from '../../content/spaces/PersonalSpaceContracts';

export const PERSONAL_SPACE_STATE_SCHEMA_VERSION = 1 as const;

const stableLocalIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const PersonalSpaceFlagOverrideSchema = z
  .object({
    spaceId: entityIdSchema('personal-space'),
    flagId: stableLocalIdSchema,
    value: z.boolean(),
  })
  .strict();

export const PersonalSpaceStateSchema = z
  .object({
    schemaVersion: z.literal(PERSONAL_SPACE_STATE_SCHEMA_VERSION),
    currentSpaceId: entityIdSchema('personal-space').nullable(),
    visitedSpaceIds: z.array(entityIdSchema('personal-space')),
    flagOverrides: z.array(PersonalSpaceFlagOverrideSchema),
  })
  .strict()
  .superRefine((state, context) => {
    if (
      new Set(state.visitedSpaceIds).size !==
      state.visitedSpaceIds.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Visited personal space IDs must be unique.',
        path: ['visitedSpaceIds'],
      });
    }

    const overrideKeys = state.flagOverrides.map(
      (override) => `${override.spaceId}/${override.flagId}`,
    );

    if (new Set(overrideKeys).size !== overrideKeys.length) {
      context.addIssue({
        code: 'custom',
        message:
          'Personal space flag overrides must be unique per space/flag.',
        path: ['flagOverrides'],
      });
    }
  });

export type PersonalSpaceState = z.infer<
  typeof PersonalSpaceStateSchema
>;

export function createInitialPersonalSpaceState(): PersonalSpaceState {
  return PersonalSpaceStateSchema.parse({
    schemaVersion: PERSONAL_SPACE_STATE_SCHEMA_VERSION,
    currentSpaceId: null,
    visitedSpaceIds: [],
    flagOverrides: [],
  });
}

function findSpace(
  catalog: PersonalSpaceCatalog,
  spaceId: PersonalSpaceId,
): PersonalSpaceDefinition {
  const space = catalog.spaces.find(
    (candidate) => candidate.id === spaceId,
  );

  if (space === undefined) {
    throw new Error(`Unknown personal space: ${spaceId}`);
  }

  return space;
}

export class PersonalSpaceStateStore {
  readonly #catalog: PersonalSpaceCatalog;
  #state: PersonalSpaceState;

  public constructor(
    catalogInput: unknown,
    stateInput: unknown = createInitialPersonalSpaceState(),
  ) {
    this.#catalog = validatePersonalSpaceCatalog(catalogInput);
    this.#state = PersonalSpaceStateSchema.parse(stateInput);

    if (this.#state.currentSpaceId !== null) {
      findSpace(this.#catalog, this.#state.currentSpaceId);
    }

    for (const spaceId of this.#state.visitedSpaceIds) {
      findSpace(this.#catalog, spaceId);
    }

    for (const override of this.#state.flagOverrides) {
      this.#requireFlag(override.spaceId, override.flagId);
    }
  }

  public exportState(): PersonalSpaceState {
    return PersonalSpaceStateSchema.parse(this.#state);
  }

  public getCatalog(): PersonalSpaceCatalog {
    return this.#catalog;
  }

  public getCurrentSpaceId(): PersonalSpaceId | null {
    return this.#state.currentSpaceId;
  }

  public enter(spaceId: PersonalSpaceId): PersonalSpaceDefinition {
    const space = findSpace(this.#catalog, spaceId);

    this.#state = PersonalSpaceStateSchema.parse({
      ...this.#state,
      currentSpaceId: spaceId,
      visitedSpaceIds: this.#state.visitedSpaceIds.includes(spaceId)
        ? this.#state.visitedSpaceIds
        : [...this.#state.visitedSpaceIds, spaceId],
    });

    return space;
  }

  public leave(): PersonalSpaceState {
    this.#state = PersonalSpaceStateSchema.parse({
      ...this.#state,
      currentSpaceId: null,
    });
    return this.exportState();
  }

  public hasVisited(spaceId: PersonalSpaceId): boolean {
    findSpace(this.#catalog, spaceId);
    return this.#state.visitedSpaceIds.includes(spaceId);
  }

  public getFlag(
    spaceId: PersonalSpaceId,
    flagId: string,
  ): boolean {
    const flag = this.#requireFlag(spaceId, flagId);
    const override = this.#state.flagOverrides.find(
      (candidate) =>
        candidate.spaceId === spaceId &&
        candidate.flagId === flagId,
    );

    return override?.value ?? flag.defaultValue;
  }

  public setFlag(
    spaceId: PersonalSpaceId,
    flagId: string,
    value: boolean,
  ): PersonalSpaceState {
    this.#requireFlag(spaceId, flagId);
    const existing = this.#state.flagOverrides.findIndex(
      (candidate) =>
        candidate.spaceId === spaceId &&
        candidate.flagId === flagId,
    );
    const next = [...this.#state.flagOverrides];
    const entry = { spaceId, flagId, value };

    if (existing === -1) {
      next.push(entry);
    } else {
      next[existing] = entry;
    }

    this.#state = PersonalSpaceStateSchema.parse({
      ...this.#state,
      flagOverrides: next,
    });

    return this.exportState();
  }

  #requireFlag(spaceId: PersonalSpaceId, flagId: string) {
    const space = findSpace(this.#catalog, spaceId);
    const flag = space.flags.find(
      (candidate) => candidate.id === flagId,
    );

    if (flag === undefined) {
      throw new Error(
        `Unknown personal-space flag ${flagId} in ${spaceId}`,
      );
    }

    return flag;
  }
}
