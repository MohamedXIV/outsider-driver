import type {
  NarrativeQueryPort,
  TranslatorNarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';
import type { TranslationRequirement } from '../../domain/translator/TranslatorRuntime';
import { TranslatorRuntime } from '../../domain/translator/TranslatorRuntime';

export class TranslatorNarrativeAdapter
  implements TranslatorNarrativeQueryPort
{
  readonly #runtime: TranslatorRuntime;

  public constructor(runtime: TranslatorRuntime) {
    this.#runtime = runtime;
  }

  public getTranslationLevel(
    requirement: TranslationRequirement,
  ): number {
    return this.#runtime.assess(requirement).levelCode;
  }
}

export function withTranslatorNarrativeQueries(
  base: NarrativeQueryPort,
  translator: TranslatorNarrativeQueryPort,
): NarrativeQueryPort {
  return {
    translator,
    hasFact: (factId) => base.hasFact(factId),
    hasClaim: (claimId) => base.hasClaim(claimId),
    coverIdentityMatches: (key, value) =>
      base.coverIdentityMatches(key, value),
    wouldContradictClaim: (proposal) =>
      base.wouldContradictClaim(proposal),
    getPassengerSuspicion: (passengerId) =>
      base.getPassengerSuspicion(passengerId),
    getCityAttention: () => base.getCityAttention(),
  };
}
