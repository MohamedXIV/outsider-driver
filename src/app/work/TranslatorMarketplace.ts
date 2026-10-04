import type { TranslatorPackId } from '../../domain/ids/EntityId';
import type { EconomyStateStore } from '../../domain/economy/EconomyState';
import type { TranslatorStateStore } from '../../domain/translator/TranslatorState';
import {
  validateTranslatorCatalog,
  type TranslatorCatalog,
  type TranslatorPackDocument,
} from '../../content/translator/TranslatorContracts';

export interface TranslatorPackPurchase {
  readonly packId: TranslatorPackId;
  readonly costCredits: number;
  readonly creditsAfter: number;
}

function requirePack(
  catalog: TranslatorCatalog,
  packId: TranslatorPackId,
): TranslatorPackDocument {
  const pack = catalog.packs.find((candidate) => candidate.id === packId);

  if (pack === undefined) {
    throw new Error(`Unknown translator pack for purchase: ${packId}`);
  }

  return pack;
}

export class TranslatorMarketplace {
  readonly #economy: EconomyStateStore;
  readonly #translator: TranslatorStateStore;
  readonly #catalog: TranslatorCatalog;

  public constructor(
    economy: EconomyStateStore,
    translator: TranslatorStateStore,
    catalogInput: unknown,
  ) {
    this.#economy = economy;
    this.#translator = translator;
    this.#catalog = validateTranslatorCatalog(catalogInput);
  }

  public purchase(packId: TranslatorPackId): TranslatorPackPurchase {
    const pack = requirePack(this.#catalog, packId);

    if (this.#translator.ownsPack(packId)) {
      throw new Error(`Translator pack is already owned: ${packId}`);
    }

    const creditsAfter = this.#economy.spendCredits(
      pack.data.costCredits,
    );
    this.#translator.grantPack(packId);

    return {
      packId,
      costCredits: pack.data.costCredits,
      creditsAfter,
    };
  }
}
