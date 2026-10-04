import type {
  RideCompletionCommitPort,
  RideCompletionContext,
} from '../rides/PassengerRideOrchestrator';
import type {
  EconomyStateStore,
  RideEconomySettlement,
} from '../../domain/economy/EconomyState';
import { WorkNetwork } from './WorkNetwork';

export type RideSettlementSink = (
  settlement: RideEconomySettlement,
  context: RideCompletionContext,
) => void;

export class EconomyRideCompletionAdapter
  implements RideCompletionCommitPort
{
  readonly #economy: EconomyStateStore;
  readonly #network: WorkNetwork;
  readonly #afterSettlement: RideSettlementSink | null;

  public constructor(
    economy: EconomyStateStore,
    network: WorkNetwork,
    afterSettlement: RideSettlementSink | null = null,
  ) {
    this.#economy = economy;
    this.#network = network;
    this.#afterSettlement = afterSettlement;
  }

  public commit(context: RideCompletionContext): void {
    const job = this.#network.getJob(context.ride.jobId);
    const settlement = this.#economy.settleCompletedRide(
      job,
      context.ride,
    );

    this.#afterSettlement?.(settlement, context);
  }
}
