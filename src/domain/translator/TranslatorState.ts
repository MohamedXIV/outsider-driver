import * as z from 'zod';
import {
  entityIdSchema,
  type TranslatorPackId,
} from '../ids/EntityId';
import {
  TRANSLATOR_RUNTIME_API_VERSION,
  isTranslatorPackCompatible,
  validateTranslatorCatalog,
  type TranslatorCatalog,
  type TranslatorPackDocument,
} from '../../content/translator/TranslatorContracts';

export const TRANSLATOR_STATE_SCHEMA_VERSION = 1 as const;

export const TranslatorStateSchema = z
  .object({
    schemaVersion: z.literal(TRANSLATOR_STATE_SCHEMA_VERSION),
    ownedPackIds: z.array(entityIdSchema('translator-pack')),
    activePackIds: z.array(entityIdSchema('translator-pack')),
  })
  .strict()
  .superRefine((state, context) => {
    if (new Set(state.ownedPackIds).size !== state.ownedPackIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Owned translator pack IDs must be unique.',
        path: ['ownedPackIds'],
      });
    }

    if (new Set(state.activePackIds).size !== state.activePackIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Active translator pack IDs must be unique.',
        path: ['activePackIds'],
      });
    }

    const owned = new Set(state.ownedPackIds);

    for (const packId of state.activePackIds) {
      if (!owned.has(packId)) {
        context.addIssue({
          code: 'custom',
          message: `Active translator pack must be owned first: ${packId}`,
          path: ['activePackIds'],
        });
      }
    }
  });

export type TranslatorState = z.infer<typeof TranslatorStateSchema>;

export function createInitialTranslatorState(): TranslatorState {
  return TranslatorStateSchema.parse({
    schemaVersion: TRANSLATOR_STATE_SCHEMA_VERSION,
    ownedPackIds: [],
    activePackIds: [],
  });
}

function requirePack(
  packId: TranslatorPackId,
  catalog: TranslatorCatalog,
): TranslatorPackDocument {
  const pack = catalog.packs.find((candidate) => candidate.id === packId);

  if (pack === undefined) {
    throw new Error(`Unknown translator pack: ${packId}`);
  }

  return pack;
}

export class TranslatorStateStore {
  readonly #catalog: TranslatorCatalog;
  #state: TranslatorState;

  public constructor(
    catalogInput: unknown,
    stateInput: unknown = createInitialTranslatorState(),
  ) {
    this.#catalog = validateTranslatorCatalog(catalogInput);
    this.#state = TranslatorStateSchema.parse(stateInput);

    for (const packId of this.#state.ownedPackIds) {
      requirePack(packId, this.#catalog);
    }

    for (const packId of this.#state.activePackIds) {
      const pack = requirePack(packId, this.#catalog);

      if (!isTranslatorPackCompatible(pack)) {
        throw new Error(
          `Active translator pack is incompatible with runtime API ${String(TRANSLATOR_RUNTIME_API_VERSION)}: ${packId}`,
        );
      }
    }
  }

  public exportState(): TranslatorState {
    return TranslatorStateSchema.parse(this.#state);
  }

  public ownsPack(packId: TranslatorPackId): boolean {
    return this.#state.ownedPackIds.includes(packId);
  }

  public isPackActive(packId: TranslatorPackId): boolean {
    return this.#state.activePackIds.includes(packId);
  }

  public grantPack(packId: TranslatorPackId): TranslatorState {
    requirePack(packId, this.#catalog);

    if (!this.ownsPack(packId)) {
      this.#state = TranslatorStateSchema.parse({
        ...this.#state,
        ownedPackIds: [...this.#state.ownedPackIds, packId],
      });
    }

    return this.exportState();
  }

  public activatePack(packId: TranslatorPackId): TranslatorState {
    const pack = requirePack(packId, this.#catalog);

    if (!this.ownsPack(packId)) {
      throw new Error(
        `Cannot activate unowned translator pack: ${packId}`,
      );
    }

    if (!isTranslatorPackCompatible(pack)) {
      throw new Error(
        `Translator pack is incompatible with runtime API ${String(TRANSLATOR_RUNTIME_API_VERSION)}: ${packId}`,
      );
    }

    if (!this.isPackActive(packId)) {
      this.#state = TranslatorStateSchema.parse({
        ...this.#state,
        activePackIds: [...this.#state.activePackIds, packId],
      });
    }

    return this.exportState();
  }

  public deactivatePack(packId: TranslatorPackId): TranslatorState {
    requirePack(packId, this.#catalog);

    this.#state = TranslatorStateSchema.parse({
      ...this.#state,
      activePackIds: this.#state.activePackIds.filter(
        (candidate) => candidate !== packId,
      ),
    });

    return this.exportState();
  }

  public getActivePacks(): readonly TranslatorPackDocument[] {
    return this.#state.activePackIds.map((packId) =>
      requirePack(packId, this.#catalog),
    );
  }
}
