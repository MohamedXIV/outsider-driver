import type { TaxiUpgradeId } from '../../domain/ids/EntityId';
import type { EconomyStateStore } from '../../domain/economy/EconomyState';
import type {
  PersonalPersistenceState,
  PersonalPersistenceStateStore,
} from '../../domain/personal/PersonalPersistenceState';

export interface UpgradePurchaseReceipt {
  readonly upgradeId: TaxiUpgradeId;
  readonly purchaseCostCredits: number;
  readonly creditsAfter: number;
}

export interface UpgradeInstallationReceipt {
  readonly upgradeId: TaxiUpgradeId;
  readonly installationCostCredits: number;
  readonly creditsAfter: number;
}

export interface MaintenanceRepairReceipt {
  readonly issueId: string;
  readonly repairCostCredits: number;
  readonly creditsAfter: number;
  readonly taxiConditionAfter: number;
}

export class PersonalPersistenceEconomyService {
  readonly #economy: EconomyStateStore;
  readonly #personal: PersonalPersistenceStateStore;

  public constructor(
    economy: EconomyStateStore,
    personal: PersonalPersistenceStateStore,
  ) {
    this.#economy = economy;
    this.#personal = personal;
  }

  public purchaseUpgrade(
    upgradeId: TaxiUpgradeId,
  ): UpgradePurchaseReceipt {
    const upgrade = this.#personal.inspectUpgrade(upgradeId);

    if (this.#personal.ownsUpgrade(upgradeId)) {
      throw new Error(
        `Taxi upgrade is already owned: ${upgradeId}`,
      );
    }

    const creditsAfter = this.#economy.spendCredits(
      upgrade.data.purchaseCostCredits,
    );
    this.#personal.grantUpgrade(upgradeId);

    return {
      upgradeId,
      purchaseCostCredits:
        upgrade.data.purchaseCostCredits,
      creditsAfter,
    };
  }

  public installUpgrade(
    upgradeId: TaxiUpgradeId,
  ): UpgradeInstallationReceipt {
    const upgrade = this.#personal.inspectUpgrade(upgradeId);
    const installed = this.#personal.getInstalledUpgrade(
      upgrade.data.slot,
    );

    if (installed?.id === upgradeId) {
      throw new Error(
        `Taxi upgrade is already installed: ${upgradeId}`,
      );
    }

    if (installed !== null) {
      throw new Error(
        `Taxi upgrade slot ${upgrade.data.slot} is already occupied by ${installed.id}.`,
      );
    }

    if (!this.#personal.ownsUpgrade(upgradeId)) {
      throw new Error(
        `Cannot install unowned taxi upgrade: ${upgradeId}`,
      );
    }

    const creditsAfter = this.#economy.spendCredits(
      upgrade.data.installationCostCredits,
    );
    this.#personal.installUpgrade(upgradeId);

    return {
      upgradeId,
      installationCostCredits:
        upgrade.data.installationCostCredits,
      creditsAfter,
    };
  }

  public repair(
    issueId: string,
  ): MaintenanceRepairReceipt {
    const issue = this.#personal
      .getActiveMaintenanceIssues()
      .find((candidate) => candidate.id === issueId);

    if (issue === undefined) {
      throw new Error(
        `Maintenance issue is not active: ${issueId}`,
      );
    }

    const creditsAfter = this.#economy.spendCredits(
      issue.repairCostCredits,
    );
    const state: PersonalPersistenceState =
      this.#personal.resolveMaintenanceIssue(issue.id);

    return {
      issueId: issue.id,
      repairCostCredits: issue.repairCostCredits,
      creditsAfter,
      taxiConditionAfter: state.taxiCondition,
    };
  }
}
