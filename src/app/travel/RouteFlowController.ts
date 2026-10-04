import type { RouteEventId, RouteId } from '../../domain/ids/EntityId';
import type {
  RouteDecisionChoice,
  RouteExperienceCatalog,
} from '../../content/routes/RouteExperienceContracts';
import { validateRouteExperienceCatalog } from '../../content/routes/RouteExperienceContracts';
import {
  validateWorldContentCatalog,
  type WorldContentCatalog,
} from '../../content/world/WorldContracts';
import {
  buildRouteEventTimeline,
  type RouteTimelineEvent,
} from '../../domain/travel/RouteEventTimeline';
import {
  TaxiAutopilotController,
  type TaxiAutopilotConfig,
  type TaxiAutopilotSnapshot,
} from './TaxiAutopilotController';

const EVENT_EPSILON_MINUTES = 1e-9;

export type RouteGameplayEvent =
  | {
      readonly type: 'route.annotation';
      readonly eventId: RouteEventId;
      readonly hookId: string;
      readonly annotationId: string;
    }
  | {
      readonly type: 'route.checkpoint';
      readonly eventId: RouteEventId;
      readonly hookId: string;
      readonly checkpointId: string;
    }
  | {
      readonly type: 'route.decision';
      readonly eventId: RouteEventId;
      readonly hookId: string;
      readonly promptKey: string;
      readonly choices: readonly RouteDecisionChoice[];
    };

export type RouteFlowResolution =
  | {
      readonly type: 'continue';
    }
  | {
      readonly type: 'choose';
      readonly choiceId: string;
    };

export interface RouteFlowStepResult {
  readonly snapshot: TaxiAutopilotSnapshot;
  readonly events: readonly RouteGameplayEvent[];
  readonly paused: RouteGameplayEvent | null;
  readonly consumedSeconds: number;
}

function toGameplayEvent(event: RouteTimelineEvent): RouteGameplayEvent {
  const { behavior } = event;

  switch (behavior.type) {
    case 'annotation':
      return {
        type: 'route.annotation',
        eventId: event.eventId,
        hookId: event.hookId,
        annotationId: behavior.annotationId,
      };
    case 'checkpoint':
      return {
        type: 'route.checkpoint',
        eventId: event.eventId,
        hookId: event.hookId,
        checkpointId: behavior.checkpointId,
      };
    case 'decision':
      return {
        type: 'route.decision',
        eventId: event.eventId,
        hookId: event.hookId,
        promptKey: behavior.promptKey,
        choices: behavior.choices,
      };
  }
}

export class RouteFlowController {
  readonly #world: WorldContentCatalog;
  readonly #experience: RouteExperienceCatalog;
  readonly #autopilot: TaxiAutopilotController;
  readonly #gameMinutesPerRealSecond: number;
  readonly #emittedEventIds = new Set<RouteEventId>();
  #timeline: readonly RouteTimelineEvent[];
  #pausedEvent: RouteTimelineEvent | null = null;

  public constructor(
    routeId: RouteId,
    worldInput: unknown,
    motionCatalogInput: unknown,
    experienceInput: unknown,
    config: TaxiAutopilotConfig,
  ) {
    this.#world = validateWorldContentCatalog(worldInput);
    this.#experience = validateRouteExperienceCatalog(
      experienceInput,
      this.#world,
    );
    this.#gameMinutesPerRealSecond = config.gameMinutesPerRealSecond;
    this.#autopilot = new TaxiAutopilotController(
      routeId,
      this.#world,
      motionCatalogInput,
      config,
    );
    this.#timeline = buildRouteEventTimeline(
      routeId,
      this.#world,
      this.#experience,
    );
  }

  public getSnapshot(): TaxiAutopilotSnapshot {
    return this.#autopilot.getSnapshot();
  }

  public getPausedEvent(): RouteGameplayEvent | null {
    return this.#pausedEvent === null
      ? null
      : toGameplayEvent(this.#pausedEvent);
  }

  public step(deltaSeconds: number): RouteFlowStepResult {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError(
        'Route flow delta must be a finite non-negative number.',
      );
    }

    if (this.#pausedEvent !== null) {
      return {
        snapshot: this.#autopilot.settle(deltaSeconds),
        events: [],
        paused: toGameplayEvent(this.#pausedEvent),
        consumedSeconds: deltaSeconds,
      };
    }

    let remainingSeconds = deltaSeconds;
    let consumedSeconds = 0;
    let snapshot = this.#autopilot.getSnapshot();
    const emittedEvents: RouteGameplayEvent[] = [];

    while (remainingSeconds > 0) {
      if (snapshot.route.state.status === 'arrived') {
        snapshot = this.#autopilot.step(remainingSeconds);
        consumedSeconds += remainingSeconds;
        break;
      }

      const currentElapsed = snapshot.route.routeElapsedMinutes;
      const requestedEnd =
        currentElapsed +
        remainingSeconds * this.#gameMinutesPerRealSecond;
      const nextEvent = this.#findNextEvent(currentElapsed, requestedEnd);

      if (nextEvent === undefined) {
        snapshot = this.#autopilot.step(remainingSeconds);
        consumedSeconds += remainingSeconds;
        break;
      }

      const gameMinutesToEvent = Math.max(
        0,
        nextEvent.routeElapsedMinutes - currentElapsed,
      );
      const secondsToEvent =
        gameMinutesToEvent / this.#gameMinutesPerRealSecond;

      if (secondsToEvent > 0) {
        snapshot = this.#autopilot.step(secondsToEvent);
        consumedSeconds += secondsToEvent;
        remainingSeconds -= secondsToEvent;
      }

      this.#emittedEventIds.add(nextEvent.eventId);
      const gameplayEvent = toGameplayEvent(nextEvent);
      emittedEvents.push(gameplayEvent);

      if (nextEvent.behavior.type !== 'annotation') {
        this.#pausedEvent = nextEvent;
        break;
      }
    }

    return {
      snapshot,
      events: emittedEvents,
      paused: this.getPausedEvent(),
      consumedSeconds,
    };
  }

  public resolvePausedEvent(
    resolution: RouteFlowResolution,
  ): TaxiAutopilotSnapshot {
    const paused = this.#pausedEvent;

    if (paused === null) {
      throw new Error('There is no paused route event to resolve.');
    }

    if (paused.behavior.type === 'checkpoint') {
      if (resolution.type !== 'continue') {
        throw new Error('Checkpoint events only accept continue resolution.');
      }

      this.#pausedEvent = null;
      return this.#autopilot.getSnapshot();
    }

    if (paused.behavior.type !== 'decision') {
      throw new Error('Annotation events never pause route flow.');
    }

    if (resolution.type !== 'choose') {
      throw new Error('Decision events require a choice resolution.');
    }

    const choice = paused.behavior.choices.find(
      (candidate) => candidate.id === resolution.choiceId,
    );

    if (choice === undefined) {
      throw new Error(
        `Unknown route decision choice: ${resolution.choiceId}`,
      );
    }

    this.#pausedEvent = null;

    if (choice.command.type === 'divert') {
      this.#replaceRoute(choice.command.routeId);
    }

    return this.#autopilot.getSnapshot();
  }

  #findNextEvent(
    currentElapsedMinutes: number,
    requestedEndMinutes: number,
  ): RouteTimelineEvent | undefined {
    return this.#timeline.find(
      (event) =>
        !this.#emittedEventIds.has(event.eventId) &&
        event.routeElapsedMinutes >=
          currentElapsedMinutes - EVENT_EPSILON_MINUTES &&
        event.routeElapsedMinutes <=
          requestedEndMinutes + EVENT_EPSILON_MINUTES,
    );
  }

  #replaceRoute(routeId: RouteId): void {
    this.#autopilot.replaceRoute(routeId);
    this.#timeline = buildRouteEventTimeline(
      routeId,
      this.#world,
      this.#experience,
    );
  }
}
