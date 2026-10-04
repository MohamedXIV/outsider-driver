import * as z from 'zod';
import {
  entityIdSchema,
  type BroadcastId,
  type RadioStationId,
} from '../ids/EntityId';
import {
  validateRadioCatalog,
  type RadioCatalog,
} from '../../content/radio/RadioContracts';
import type { TranslatorCatalog } from '../../content/translator/TranslatorContracts';
import type { WorldContentCatalog } from '../../content/world/WorldContracts';
import type { JobContract } from '../work/JobRideContracts';
import type { PassengerCatalog } from '../../content/passengers/PassengerContracts';

export const RADIO_STATE_SCHEMA_VERSION = 1 as const;

export const RadioStateSchema = z
  .object({
    schemaVersion: z.literal(RADIO_STATE_SCHEMA_VERSION),
    tunedStationId: entityIdSchema('radio-station').nullable(),
    listening: z.boolean(),
    heardBroadcastIds: z.array(entityIdSchema('broadcast')),
  })
  .strict()
  .refine(
    (state) =>
      new Set(state.heardBroadcastIds).size ===
      state.heardBroadcastIds.length,
    {
      message: 'Heard broadcast IDs must be unique.',
      path: ['heardBroadcastIds'],
    },
  );

export type RadioState = z.infer<typeof RadioStateSchema>;

export function createInitialRadioState(): RadioState {
  return RadioStateSchema.parse({
    schemaVersion: RADIO_STATE_SCHEMA_VERSION,
    tunedStationId: null,
    listening: false,
    heardBroadcastIds: [],
  });
}

export interface RadioStateCatalogDependencies {
  readonly translator: TranslatorCatalog;
  readonly world: WorldContentCatalog;
  readonly jobs: readonly JobContract[];
  readonly passengers: PassengerCatalog;
}

export class RadioStateStore {
  readonly #catalog: RadioCatalog;
  #state: RadioState;

  public constructor(
    catalogInput: unknown,
    dependencies: RadioStateCatalogDependencies,
    stateInput: unknown = createInitialRadioState(),
  ) {
    this.#catalog = validateRadioCatalog(
      catalogInput,
      dependencies.translator,
      dependencies.world,
      dependencies.jobs,
      dependencies.passengers,
    );
    this.#state = RadioStateSchema.parse(stateInput);

    if (this.#state.tunedStationId !== null) {
      this.#requireStation(this.#state.tunedStationId);
    }

    for (const broadcastId of this.#state.heardBroadcastIds) {
      this.#requireBroadcast(broadcastId);
    }
  }

  public exportState(): RadioState {
    return RadioStateSchema.parse(this.#state);
  }

  public getCatalog(): RadioCatalog {
    return this.#catalog;
  }

  public tune(stationId: RadioStationId): RadioState {
    this.#requireStation(stationId);
    this.#state = RadioStateSchema.parse({
      ...this.#state,
      tunedStationId: stationId,
    });
    return this.exportState();
  }

  public setListening(listening: boolean): RadioState {
    this.#state = RadioStateSchema.parse({
      ...this.#state,
      listening,
    });
    return this.exportState();
  }

  public getTunedStationId(): RadioStationId | null {
    return this.#state.tunedStationId;
  }

  public isListening(): boolean {
    return this.#state.listening;
  }

  public hasHeard(broadcastId: BroadcastId): boolean {
    return this.#state.heardBroadcastIds.includes(broadcastId);
  }

  public markHeard(broadcastId: BroadcastId): RadioState {
    this.#requireBroadcast(broadcastId);

    if (!this.hasHeard(broadcastId)) {
      this.#state = RadioStateSchema.parse({
        ...this.#state,
        heardBroadcastIds: [
          ...this.#state.heardBroadcastIds,
          broadcastId,
        ],
      });
    }

    return this.exportState();
  }

  #requireStation(stationId: RadioStationId): void {
    if (!this.#catalog.stations.some((station) => station.id === stationId)) {
      throw new Error(`Unknown radio station: ${stationId}`);
    }
  }

  #requireBroadcast(broadcastId: BroadcastId): void {
    if (
      !this.#catalog.broadcasts.some(
        (broadcast) => broadcast.id === broadcastId,
      )
    ) {
      throw new Error(`Unknown radio broadcast: ${broadcastId}`);
    }
  }
}
