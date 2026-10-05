import {
  compareGameTime,
  type GameTime,
} from '../../domain/time/GameTime';
import {
  requireJobEligibility,
  validateJobReferences,
  validateRideReferences,
  type JobContract,
  type RideContract,
  type WorkEligibilityContext,
} from '../../domain/work/JobRideContracts';
import type {
  PassengerId,
  RideId,
  RouteId,
} from '../../domain/ids/EntityId';
import {
  validatePassengerCatalog,
  type PassengerCatalog,
  type PassengerDocument,
} from '../../content/passengers/PassengerContracts';
import {
  validateWorldContentCatalog,
  type RouteDocument,
  type WorldContentCatalog,
} from '../../content/world/WorldContracts';
import { InkNarrativeRuntime } from '../../narrative/InkNarrativeRuntime';
import type { NarrativeTurn } from '../../narrative/contracts/NarrativePresentation';
import { resolvePassengerPerformanceCue } from './PassengerPerformancePresentation';
import type {
  NarrativeEventSink,
  NarrativeQueryPort,
} from '../../narrative/contracts/NarrativeBoundary';
import {
  RouteFlowController,
  type RouteFlowResolution,
  type RouteGameplayEvent,
} from '../travel/RouteFlowController';
import type { TaxiAutopilotConfig } from '../travel/TaxiAutopilotController';
import {
  RideSessionSaveSchema,
  type RideSessionSave,
} from './RideSessionContracts';

type CompletedRideContract = Extract<RideContract, { status: 'completed' }>;

export interface NarrativeStorySourcePort {
  getInkSource(storyId: string): string;
}

export interface RideCompletionContext {
  readonly ride: CompletedRideContract;
  readonly passenger: PassengerDocument;
  readonly emittedRouteEventIds: readonly string[];
  readonly narrativeEnded: boolean;
}

export interface RideCompletionCommitPort {
  commit(context: RideCompletionContext): void;
}

export interface PassengerRideDependencies {
  readonly world: unknown;
  readonly motionCatalog: unknown;
  readonly routeExperience: unknown;
  readonly passengers: unknown;
  readonly narrativeStories: NarrativeStorySourcePort;
  readonly narrativeQueries: NarrativeQueryPort;
  readonly narrativeEvents: NarrativeEventSink;
  readonly workEligibility: WorkEligibilityContext;
  readonly completion: RideCompletionCommitPort;
  readonly autopilot: TaxiAutopilotConfig;
}

export interface RidePresentation {
  readonly phase: RideSessionSave['phase'];
  readonly passenger: {
    readonly id: PassengerId;
    readonly displayName: string;
    readonly lifecycleKind: PassengerDocument['data']['lifecycleKind'];
  };
  readonly dialogue: NarrativeTurn | null;
  readonly performanceCue: string | null;
  readonly pausedRouteEvent: RouteGameplayEvent | null;
  readonly routeProgress: number | null;
  readonly canDropOff: boolean;
}

export interface RideAdvanceResult {
  readonly presentation: RidePresentation;
  readonly events: readonly RouteGameplayEvent[];
  readonly consumedSeconds: number;
}

function knownPassengerIds(catalog: PassengerCatalog): ReadonlySet<PassengerId> {
  return new Set(catalog.passengers.map((passenger) => passenger.id));
}

function requirePassenger(
  passengerId: PassengerId,
  catalog: PassengerCatalog,
): PassengerDocument {
  const passenger = catalog.passengers.find(
    (candidate) => candidate.id === passengerId,
  );

  if (passenger === undefined) {
    throw new Error(`Unknown passenger: ${passengerId}`);
  }

  return passenger;
}

function requireRoute(routeId: RouteId, world: WorldContentCatalog): RouteDocument {
  const route = world.routes.find((candidate) => candidate.id === routeId);

  if (route === undefined) {
    throw new Error(`Unknown route: ${routeId}`);
  }

  return route;
}

function assertRideCompatibleRoute(
  routeId: RouteId,
  session: RideSessionSave,
  world: WorldContentCatalog,
): void {
  const route = requireRoute(routeId, world);

  if (
    route.data.originLocationId !== session.pickupLocationId ||
    route.data.destinationLocationId !== session.destinationLocationId
  ) {
    throw new Error(
      `Route ${routeId} cannot be used by ride ${session.rideId}: endpoints do not match.`,
    );
  }
}

function assertAcceptedWithinAvailability(
  acceptedAt: GameTime,
  job: JobContract,
): void {
  if (
    compareGameTime(job.availability.opensAt, acceptedAt) > 0 ||
    compareGameTime(acceptedAt, job.availability.closesAt) > 0
  ) {
    throw new Error('A ride cannot be accepted outside the job availability window.');
  }
}

export class PassengerRideOrchestrator {
  readonly #dependencies: PassengerRideDependencies;
  readonly #world: WorldContentCatalog;
  readonly #passengers: PassengerCatalog;
  readonly #passenger: PassengerDocument;
  readonly #knownPassengerIds: ReadonlySet<PassengerId>;
  #session: RideSessionSave;
  #routeFlow: RouteFlowController | null = null;
  #narrative: InkNarrativeRuntime | null = null;

  public static acceptJob(
    jobInput: unknown,
    rideId: RideId,
    acceptedAt: GameTime,
    dependencies: PassengerRideDependencies,
  ): PassengerRideOrchestrator {
    const passengers = validatePassengerCatalog(dependencies.passengers);
    const referencedJob = validateJobReferences(
      jobInput,
      dependencies.world,
      knownPassengerIds(passengers),
    );
    const job = requireJobEligibility(
      referencedJob,
      dependencies.workEligibility,
    );
    assertAcceptedWithinAvailability(acceptedAt, job);
    const passenger = requirePassenger(job.passengerId, passengers);

    return new PassengerRideOrchestrator(
      {
        phase: 'assigned',
        rideId,
        jobId: job.id,
        passengerId: job.passengerId,
        pickupLocationId: job.pickupLocationId,
        destinationLocationId: job.destinationLocationId,
        initialRouteId: job.routeId,
        acceptedAt,
        narrativeStoryId: passenger.data.narrativeStoryId,
      },
      dependencies,
    );
  }

  public static restore(
    sessionInput: unknown,
    dependencies: PassengerRideDependencies,
  ): PassengerRideOrchestrator {
    return new PassengerRideOrchestrator(
      RideSessionSaveSchema.parse(sessionInput),
      dependencies,
    );
  }

  private constructor(
    sessionInput: RideSessionSave,
    dependencies: PassengerRideDependencies,
  ) {
    this.#dependencies = dependencies;
    this.#world = validateWorldContentCatalog(dependencies.world);
    this.#passengers = validatePassengerCatalog(dependencies.passengers);
    this.#knownPassengerIds = knownPassengerIds(this.#passengers);
    this.#session = RideSessionSaveSchema.parse(sessionInput);
    this.#passenger = requirePassenger(
      this.#session.passengerId,
      this.#passengers,
    );

    if (
      this.#passenger.data.narrativeStoryId !==
      this.#session.narrativeStoryId
    ) {
      throw new Error(
        'Saved ride narrative story does not match the passenger content contract.',
      );
    }

    assertRideCompatibleRoute(
      this.#session.initialRouteId,
      this.#session,
      this.#world,
    );
    this.#hydrateRuntimeState();
  }

  public pickup(startedAt: GameTime): RidePresentation {
    if (this.#session.phase !== 'assigned') {
      throw new Error('Only an assigned ride can pick up its passenger.');
    }

    if (compareGameTime(this.#session.acceptedAt, startedAt) > 0) {
      throw new Error('Passenger pickup cannot occur before ride acceptance.');
    }

    this.#routeFlow = new RouteFlowController(
      this.#session.initialRouteId,
      this.#dependencies.world,
      this.#dependencies.motionCatalog,
      this.#dependencies.routeExperience,
      this.#dependencies.autopilot,
    );
    this.#narrative = this.#createNarrative();
    const dialogue = this.#narrative.continueUntilChoiceOrEnd();

    this.#session = RideSessionSaveSchema.parse({
      ...this.#session,
      phase: 'active',
      startedAt,
      routeFlow: this.#routeFlow.exportState(),
      narrativeStateJson: this.#narrative.serializeState(),
      dialogue,
    });

    return this.getPresentation();
  }

  public advance(deltaSeconds: number): RideAdvanceResult {
    this.#requireLiveRide('advance');
    const routeFlow = this.#requireRouteFlow();
    const result = routeFlow.step(deltaSeconds);

    if (this.#session.phase !== 'active') {
      throw new Error('Only an active ride can advance.');
    }

    const nextShared = {
      ...this.#session,
      routeFlow: routeFlow.exportState(),
      narrativeStateJson: this.#requireNarrative().serializeState(),
    };

    this.#session = RideSessionSaveSchema.parse(
      result.snapshot.route.state.status === 'arrived' &&
        result.paused === null
        ? {
            ...nextShared,
            phase: 'dropoff-ready',
          }
        : nextShared,
    );

    return {
      presentation: this.getPresentation(),
      events: result.events,
      consumedSeconds: result.consumedSeconds,
    };
  }

  public resolveRouteEvent(
    resolution: RouteFlowResolution,
  ): RidePresentation {
    this.#requireLiveRide('resolve a route event');
    const routeFlow = this.#requireRouteFlow();
    const paused = routeFlow.getPausedEvent();

    if (paused?.type === 'route.decision' && resolution.type === 'choose') {
      const choice = paused.choices.find(
        (candidate) => candidate.id === resolution.choiceId,
      );

      if (choice?.command.type === 'divert') {
        assertRideCompatibleRoute(
          choice.command.routeId,
          this.#session,
          this.#world,
        );
      }
    }

    routeFlow.resolvePausedEvent(resolution);
    this.#persistLiveRuntimeState();
    return this.getPresentation();
  }

  public chooseDialogue(choiceIndex: number): RidePresentation {
    this.#requireLiveRide('choose dialogue');
    const dialogue = this.#requireNarrative().choose(choiceIndex);

    if (
      this.#session.phase !== 'active' &&
      this.#session.phase !== 'dropoff-ready'
    ) {
      throw new Error('Dialogue is unavailable for this ride phase.');
    }

    this.#session = RideSessionSaveSchema.parse({
      ...this.#session,
      dialogue,
      narrativeStateJson: this.#requireNarrative().serializeState(),
    });

    return this.getPresentation();
  }

  public dropOff(completedAt: GameTime): RidePresentation {
    if (this.#session.phase !== 'dropoff-ready') {
      throw new Error('A ride can only be dropped off after route arrival.');
    }

    if (compareGameTime(this.#session.startedAt, completedAt) > 0) {
      throw new Error('Ride completion cannot occur before passenger pickup.');
    }

    const routeFlow = this.#requireRouteFlow();
    const routeSnapshot = routeFlow.getSnapshot();

    if (routeSnapshot.route.state.status !== 'arrived') {
      throw new Error('Drop-off requires an arrived route.');
    }

    const finalRouteId = routeSnapshot.route.state.routeId;
    assertRideCompatibleRoute(finalRouteId, this.#session, this.#world);

    const ride = validateRideReferences(
      {
        id: this.#session.rideId,
        jobId: this.#session.jobId,
        passengerId: this.#session.passengerId,
        pickupLocationId: this.#session.pickupLocationId,
        destinationLocationId: this.#session.destinationLocationId,
        routeId: finalRouteId,
        acceptedAt: this.#session.acceptedAt,
        status: 'completed',
        startedAt: this.#session.startedAt,
        completedAt,
      },
      this.#world,
      this.#knownPassengerIds,
    );

    if (ride.status !== 'completed') {
      throw new Error('Validated drop-off unexpectedly produced a non-completed ride.');
    }

    this.#dependencies.completion.commit({
      ride,
      passenger: this.#passenger,
      emittedRouteEventIds: [...this.#session.routeFlow.emittedEventIds],
      narrativeEnded: this.#session.dialogue.ended,
    });

    this.#session = RideSessionSaveSchema.parse({
      phase: 'completed',
      rideId: this.#session.rideId,
      jobId: this.#session.jobId,
      passengerId: this.#session.passengerId,
      pickupLocationId: this.#session.pickupLocationId,
      destinationLocationId: this.#session.destinationLocationId,
      initialRouteId: this.#session.initialRouteId,
      acceptedAt: this.#session.acceptedAt,
      narrativeStoryId: this.#session.narrativeStoryId,
      startedAt: this.#session.startedAt,
      completedAt,
      finalRouteId,
    });

    this.#routeFlow = null;
    this.#narrative = null;
    return this.getPresentation();
  }

  public getSessionSave(): RideSessionSave {
    return RideSessionSaveSchema.parse(this.#session);
  }

  public getRideContract(): RideContract {
    const base = {
      id: this.#session.rideId,
      jobId: this.#session.jobId,
      passengerId: this.#session.passengerId,
      pickupLocationId: this.#session.pickupLocationId,
      destinationLocationId: this.#session.destinationLocationId,
      acceptedAt: this.#session.acceptedAt,
    };

    if (this.#session.phase === 'assigned') {
      return validateRideReferences(
        {
          ...base,
          routeId: this.#session.initialRouteId,
          status: 'accepted',
        },
        this.#world,
        this.#knownPassengerIds,
      );
    }

    if (this.#session.phase === 'completed') {
      return validateRideReferences(
        {
          ...base,
          routeId: this.#session.finalRouteId,
          status: 'completed',
          startedAt: this.#session.startedAt,
          completedAt: this.#session.completedAt,
        },
        this.#world,
        this.#knownPassengerIds,
      );
    }

    const routeSnapshot = this.#requireRouteFlow().getSnapshot().route;
    const route = requireRoute(routeSnapshot.state.routeId, this.#world);
    const lastSegmentId = route.data.segmentIds.at(-1);

    if (lastSegmentId === undefined) {
      throw new Error('Validated ride route unexpectedly has no segments.');
    }

    return validateRideReferences(
      {
        ...base,
        routeId: routeSnapshot.state.routeId,
        status: 'active',
        startedAt: this.#session.startedAt,
        currentSegmentId:
          routeSnapshot.state.status === 'travelling'
            ? routeSnapshot.state.currentSegmentId
            : lastSegmentId,
        segmentProgress:
          routeSnapshot.state.status === 'travelling'
            ? routeSnapshot.segmentProgress
            : 1,
      },
      this.#world,
      this.#knownPassengerIds,
    );
  }

  public getPresentation(): RidePresentation {
    const passenger = {
      id: this.#passenger.id,
      displayName: this.#passenger.data.displayName,
      lifecycleKind: this.#passenger.data.lifecycleKind,
    };

    if (this.#session.phase === 'assigned') {
      return {
        phase: this.#session.phase,
        passenger,
        dialogue: null,
        performanceCue: null,
        pausedRouteEvent: null,
        routeProgress: null,
        canDropOff: false,
      };
    }

    if (this.#session.phase === 'completed') {
      return {
        phase: this.#session.phase,
        passenger,
        dialogue: null,
        performanceCue: null,
        pausedRouteEvent: null,
        routeProgress: 1,
        canDropOff: false,
      };
    }

    const routeFlow = this.#requireRouteFlow();

    return {
      phase: this.#session.phase,
      passenger,
      dialogue: this.#session.dialogue,
      performanceCue: resolvePassengerPerformanceCue(
        this.#session.dialogue,
      ),
      pausedRouteEvent: routeFlow.getPausedEvent(),
      routeProgress: routeFlow.getSnapshot().route.routeProgress,
      canDropOff: this.#session.phase === 'dropoff-ready',
    };
  }

  #hydrateRuntimeState(): void {
    if (
      this.#session.phase !== 'active' &&
      this.#session.phase !== 'dropoff-ready'
    ) {
      return;
    }

    this.#routeFlow = RouteFlowController.fromState(
      this.#session.routeFlow,
      this.#dependencies.world,
      this.#dependencies.motionCatalog,
      this.#dependencies.routeExperience,
      this.#dependencies.autopilot,
    );
    this.#narrative = this.#createNarrative();
    this.#narrative.restoreState(this.#session.narrativeStateJson);
  }

  #persistLiveRuntimeState(): void {
    if (
      this.#session.phase !== 'active' &&
      this.#session.phase !== 'dropoff-ready'
    ) {
      throw new Error('Ride runtime state is unavailable for this phase.');
    }

    this.#session = RideSessionSaveSchema.parse({
      ...this.#session,
      routeFlow: this.#requireRouteFlow().exportState(),
      narrativeStateJson: this.#requireNarrative().serializeState(),
    });
  }

  #createNarrative(): InkNarrativeRuntime {
    return InkNarrativeRuntime.fromInkSource(
      this.#dependencies.narrativeStories.getInkSource(
        this.#session.narrativeStoryId,
      ),
      this.#dependencies.narrativeQueries,
      this.#dependencies.narrativeEvents,
    );
  }

  #requireRouteFlow(): RouteFlowController {
    if (this.#routeFlow === null) {
      throw new Error('Ride route flow is not active.');
    }

    return this.#routeFlow;
  }

  #requireNarrative(): InkNarrativeRuntime {
    if (this.#narrative === null) {
      throw new Error('Ride narrative is not active.');
    }

    return this.#narrative;
  }

  #requireLiveRide(action: string): void {
    if (
      this.#session.phase !== 'active' &&
      this.#session.phase !== 'dropoff-ready'
    ) {
      throw new Error(
        `Cannot ${action} while ride phase is ${this.#session.phase}.`,
      );
    }
  }
}
