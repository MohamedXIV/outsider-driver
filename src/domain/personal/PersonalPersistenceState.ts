import * as z from 'zod';
import {
  entityIdSchema,
  type ItemId,
  type MessageId,
  type TaxiUpgradeId,
} from '../ids/EntityId';
import {
  PersonalStableKeySchema,
  TaxiUpgradeSlotSchema,
  validatePersonalPersistenceCatalog,
  type MaintenanceIssueDefinition,
  type PersonalPersistenceCatalog,
  type PersonalItemDocument,
  type PersonalMessageDocument,
  type TaxiUpgradeDocument,
  type TaxiUpgradeSlot,
} from '../../content/personal/PersonalPersistenceContracts';
import type { PassengerCatalog } from '../../content/passengers/PassengerContracts';

export const PERSONAL_PERSISTENCE_STATE_SCHEMA_VERSION = 1 as const;

export const PersonalPersistenceStateSchema = z
  .object({
    schemaVersion: z.literal(
      PERSONAL_PERSISTENCE_STATE_SCHEMA_VERSION,
    ),
    ownedUpgradeIds: z.array(entityIdSchema('taxi-upgrade')),
    installedUpgradeIds: z.array(entityIdSchema('taxi-upgrade')),
    taxiCondition: z.number().int().min(0).max(100),
    activeMaintenanceIssueIds: z.array(PersonalStableKeySchema),
    ownedItemIds: z.array(entityIdSchema('item')),
    deliveredMessageIds: z.array(entityIdSchema('message')),
    readMessageIds: z.array(entityIdSchema('message')),
  })
  .strict()
  .superRefine((state, context) => {
    const uniqueChecks = [
      ['ownedUpgradeIds', state.ownedUpgradeIds],
      ['installedUpgradeIds', state.installedUpgradeIds],
      ['activeMaintenanceIssueIds', state.activeMaintenanceIssueIds],
      ['ownedItemIds', state.ownedItemIds],
      ['deliveredMessageIds', state.deliveredMessageIds],
      ['readMessageIds', state.readMessageIds],
    ] as const;

    for (const [path, values] of uniqueChecks) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: 'custom',
          message: `${path} must contain unique IDs.`,
          path: [path],
        });
      }
    }

    const ownedUpgrades = new Set(state.ownedUpgradeIds);

    for (const upgradeId of state.installedUpgradeIds) {
      if (!ownedUpgrades.has(upgradeId)) {
        context.addIssue({
          code: 'custom',
          message:
            `Installed upgrade must be owned first: ${upgradeId}`,
          path: ['installedUpgradeIds'],
        });
      }
    }

    const deliveredMessages = new Set(
      state.deliveredMessageIds,
    );

    for (const messageId of state.readMessageIds) {
      if (!deliveredMessages.has(messageId)) {
        context.addIssue({
          code: 'custom',
          message:
            `Read message must be delivered first: ${messageId}`,
          path: ['readMessageIds'],
        });
      }
    }
  });

export type PersonalPersistenceState = z.infer<
  typeof PersonalPersistenceStateSchema
>;

export interface TaxiUpgradeRiskSignal {
  readonly upgradeId: TaxiUpgradeId;
  readonly legality: TaxiUpgradeDocument['data']['legality'];
  readonly riskFootprint: number;
}

export function createInitialPersonalPersistenceState(): PersonalPersistenceState {
  return PersonalPersistenceStateSchema.parse({
    schemaVersion: PERSONAL_PERSISTENCE_STATE_SCHEMA_VERSION,
    ownedUpgradeIds: [],
    installedUpgradeIds: [],
    taxiCondition: 100,
    activeMaintenanceIssueIds: [],
    ownedItemIds: [],
    deliveredMessageIds: [],
    readMessageIds: [],
  });
}

function clampCondition(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export class PersonalPersistenceStateStore {
  readonly #catalog: PersonalPersistenceCatalog;
  #state: PersonalPersistenceState;

  public constructor(
    catalogInput: unknown,
    passengers: PassengerCatalog,
    stateInput: unknown = createInitialPersonalPersistenceState(),
  ) {
    this.#catalog = validatePersonalPersistenceCatalog(
      catalogInput,
      passengers,
    );
    this.#state = PersonalPersistenceStateSchema.parse(
      stateInput,
    );
    this.#validateCatalogReferences();
  }

  public exportState(): PersonalPersistenceState {
    return PersonalPersistenceStateSchema.parse(this.#state);
  }

  public inspectUpgrade(
    upgradeId: TaxiUpgradeId,
  ): TaxiUpgradeDocument {
    return this.#requireUpgrade(upgradeId);
  }

  public ownsUpgrade(upgradeId: TaxiUpgradeId): boolean {
    return this.#state.ownedUpgradeIds.includes(upgradeId);
  }

  public grantUpgrade(upgradeId: TaxiUpgradeId): PersonalPersistenceState {
    this.#requireUpgrade(upgradeId);

    if (!this.ownsUpgrade(upgradeId)) {
      this.#state = PersonalPersistenceStateSchema.parse({
        ...this.#state,
        ownedUpgradeIds: [
          ...this.#state.ownedUpgradeIds,
          upgradeId,
        ],
      });
    }

    return this.exportState();
  }

  public installUpgrade(
    upgradeId: TaxiUpgradeId,
  ): PersonalPersistenceState {
    const upgrade = this.#requireUpgrade(upgradeId);

    if (!this.ownsUpgrade(upgradeId)) {
      throw new Error(
        `Cannot install unowned taxi upgrade: ${upgradeId}`,
      );
    }

    const installedInSlot = this.getInstalledUpgrade(
      upgrade.data.slot,
    );

    if (
      installedInSlot !== null &&
      installedInSlot.id !== upgradeId
    ) {
      throw new Error(
        `Taxi upgrade slot ${upgrade.data.slot} is already occupied by ${installedInSlot.id}.`,
      );
    }

    if (!this.#state.installedUpgradeIds.includes(upgradeId)) {
      this.#state = PersonalPersistenceStateSchema.parse({
        ...this.#state,
        installedUpgradeIds: [
          ...this.#state.installedUpgradeIds,
          upgradeId,
        ],
      });
    }

    return this.exportState();
  }

  public removeUpgrade(
    upgradeId: TaxiUpgradeId,
  ): PersonalPersistenceState {
    this.#requireUpgrade(upgradeId);

    this.#state = PersonalPersistenceStateSchema.parse({
      ...this.#state,
      installedUpgradeIds:
        this.#state.installedUpgradeIds.filter(
          (candidate) => candidate !== upgradeId,
        ),
    });

    return this.exportState();
  }

  public getInstalledUpgrade(
    slotInput: TaxiUpgradeSlot,
  ): TaxiUpgradeDocument | null {
    const slot = TaxiUpgradeSlotSchema.parse(slotInput);

    for (const upgradeId of this.#state.installedUpgradeIds) {
      const upgrade = this.#requireUpgrade(upgradeId);

      if (upgrade.data.slot === slot) {
        return upgrade;
      }
    }

    return null;
  }

  public hasTaxiCapability(capability: string): boolean {
    const parsed = PersonalStableKeySchema.parse(capability);

    return this.#state.installedUpgradeIds.some((upgradeId) =>
      this.#requireUpgrade(upgradeId).data.capabilities.includes(
        parsed,
      ),
    );
  }

  public getInstalledUpgradeRiskSignals(): readonly TaxiUpgradeRiskSignal[] {
    return this.#state.installedUpgradeIds.map((upgradeId) => {
      const upgrade = this.#requireUpgrade(upgradeId);

      return {
        upgradeId,
        legality: upgrade.data.legality,
        riskFootprint: upgrade.data.riskFootprint,
      };
    });
  }

  public getTaxiCondition(): number {
    return this.#state.taxiCondition;
  }

  public adjustTaxiCondition(delta: number): PersonalPersistenceState {
    if (!Number.isFinite(delta)) {
      throw new RangeError(
        'Taxi condition delta must be a finite number.',
      );
    }

    this.#state = PersonalPersistenceStateSchema.parse({
      ...this.#state,
      taxiCondition: clampCondition(
        this.#state.taxiCondition + delta,
      ),
    });

    return this.exportState();
  }

  public reportMaintenanceIssue(
    issueId: string,
  ): PersonalPersistenceState {
    this.#requireMaintenanceIssue(issueId);

    if (
      !this.#state.activeMaintenanceIssueIds.includes(issueId)
    ) {
      this.#state = PersonalPersistenceStateSchema.parse({
        ...this.#state,
        activeMaintenanceIssueIds: [
          ...this.#state.activeMaintenanceIssueIds,
          issueId,
        ],
      });
    }

    return this.exportState();
  }

  public hasMaintenanceIssue(issueId: string): boolean {
    const parsed = PersonalStableKeySchema.parse(issueId);
    return this.#state.activeMaintenanceIssueIds.includes(parsed);
  }

  public getActiveMaintenanceIssues(): readonly MaintenanceIssueDefinition[] {
    return this.#state.activeMaintenanceIssueIds.map((issueId) =>
      this.#requireMaintenanceIssue(issueId),
    );
  }

  public resolveMaintenanceIssue(
    issueId: string,
  ): PersonalPersistenceState {
    const issue = this.#requireMaintenanceIssue(issueId);

    if (!this.hasMaintenanceIssue(issue.id)) {
      throw new Error(
        `Maintenance issue is not active: ${issue.id}`,
      );
    }

    this.#state = PersonalPersistenceStateSchema.parse({
      ...this.#state,
      taxiCondition: clampCondition(
        this.#state.taxiCondition +
          issue.conditionRestored,
      ),
      activeMaintenanceIssueIds:
        this.#state.activeMaintenanceIssueIds.filter(
          (candidate) => candidate !== issue.id,
        ),
    });

    return this.exportState();
  }

  public needsMaintenance(): boolean {
    return (
      this.#state.taxiCondition < 75 ||
      this.#state.activeMaintenanceIssueIds.length > 0
    );
  }

  public grantItem(itemId: ItemId): PersonalPersistenceState {
    this.#requireItem(itemId);

    if (!this.hasItem(itemId)) {
      this.#state = PersonalPersistenceStateSchema.parse({
        ...this.#state,
        ownedItemIds: [...this.#state.ownedItemIds, itemId],
      });
    }

    return this.exportState();
  }

  public hasItem(itemId: ItemId): boolean {
    return this.#state.ownedItemIds.includes(itemId);
  }

  public getOwnedItems(): readonly PersonalItemDocument[] {
    return this.#state.ownedItemIds.map((itemId) =>
      this.#requireItem(itemId),
    );
  }

  public deliverMessage(
    messageId: MessageId,
  ): PersonalPersistenceState {
    this.#requireMessage(messageId);

    if (!this.#state.deliveredMessageIds.includes(messageId)) {
      this.#state = PersonalPersistenceStateSchema.parse({
        ...this.#state,
        deliveredMessageIds: [
          ...this.#state.deliveredMessageIds,
          messageId,
        ],
      });
    }

    return this.exportState();
  }

  public readMessage(
    messageId: MessageId,
  ): PersonalPersistenceState {
    this.#requireMessage(messageId);

    if (!this.#state.deliveredMessageIds.includes(messageId)) {
      throw new Error(
        `Cannot read undelivered message: ${messageId}`,
      );
    }

    if (!this.#state.readMessageIds.includes(messageId)) {
      this.#state = PersonalPersistenceStateSchema.parse({
        ...this.#state,
        readMessageIds: [
          ...this.#state.readMessageIds,
          messageId,
        ],
      });
    }

    return this.exportState();
  }

  public hasUnreadMessage(messageId: MessageId): boolean {
    this.#requireMessage(messageId);

    return (
      this.#state.deliveredMessageIds.includes(messageId) &&
      !this.#state.readMessageIds.includes(messageId)
    );
  }

  public hasUnreadMessages(): boolean {
    return this.#state.deliveredMessageIds.some(
      (messageId) =>
        !this.#state.readMessageIds.includes(messageId),
    );
  }

  public getUnreadMessages(): readonly PersonalMessageDocument[] {
    return this.#state.deliveredMessageIds
      .filter(
        (messageId) =>
          !this.#state.readMessageIds.includes(messageId),
      )
      .map((messageId) => this.#requireMessage(messageId));
  }

  #validateCatalogReferences(): void {
    const ownedSlots = new Map<TaxiUpgradeSlot, TaxiUpgradeId>();

    for (const upgradeId of this.#state.ownedUpgradeIds) {
      this.#requireUpgrade(upgradeId);
    }

    for (const upgradeId of this.#state.installedUpgradeIds) {
      const upgrade = this.#requireUpgrade(upgradeId);
      const existing = ownedSlots.get(upgrade.data.slot);

      if (existing !== undefined && existing !== upgradeId) {
        throw new Error(
          `Persisted taxi upgrades conflict in slot ${upgrade.data.slot}: ${existing}, ${upgradeId}`,
        );
      }

      ownedSlots.set(upgrade.data.slot, upgradeId);
    }

    for (const issueId of this.#state.activeMaintenanceIssueIds) {
      this.#requireMaintenanceIssue(issueId);
    }

    for (const itemId of this.#state.ownedItemIds) {
      this.#requireItem(itemId);
    }

    for (const messageId of this.#state.deliveredMessageIds) {
      this.#requireMessage(messageId);
    }

    for (const messageId of this.#state.readMessageIds) {
      this.#requireMessage(messageId);
    }
  }

  #requireUpgrade(upgradeId: TaxiUpgradeId): TaxiUpgradeDocument {
    const upgrade = this.#catalog.upgrades.find(
      (candidate) => candidate.id === upgradeId,
    );

    if (upgrade === undefined) {
      throw new Error(`Unknown taxi upgrade: ${upgradeId}`);
    }

    return upgrade;
  }

  #requireItem(itemId: ItemId): PersonalItemDocument {
    const item = this.#catalog.items.find(
      (candidate) => candidate.id === itemId,
    );

    if (item === undefined) {
      throw new Error(`Unknown personal item: ${itemId}`);
    }

    return item;
  }

  #requireMessage(messageId: MessageId): PersonalMessageDocument {
    const message = this.#catalog.messages.find(
      (candidate) => candidate.id === messageId,
    );

    if (message === undefined) {
      throw new Error(`Unknown personal message: ${messageId}`);
    }

    return message;
  }

  #requireMaintenanceIssue(
    issueId: string,
  ): MaintenanceIssueDefinition {
    const parsed = PersonalStableKeySchema.parse(issueId);
    const issue = this.#catalog.maintenanceIssues.find(
      (candidate) => candidate.id === parsed,
    );

    if (issue === undefined) {
      throw new Error(
        `Unknown maintenance issue: ${parsed}`,
      );
    }

    return issue;
  }
}
