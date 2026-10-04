import type {
  RouteEventId,
  RouteId,
  RouteSegmentId,
} from '../ids/EntityId';
import {
  validateWorldContentCatalog,
  type RouteEventDocument,
  type RouteSegmentDocument,
  type WorldContentCatalog,
} from '../../content/world/WorldContracts';
import {
  validateRouteExperienceCatalog,
  type RouteEventBehavior,
  type RouteExperienceCatalog,
} from '../../content/routes/RouteExperienceContracts';

export interface RouteTimelineEvent {
  readonly eventId: RouteEventId;
  readonly segmentId: RouteSegmentId;
  readonly hookId: string;
  readonly routeElapsedMinutes: number;
  readonly behavior: RouteEventBehavior;
}

function requireSegment(
  segmentId: RouteSegmentId,
  world: WorldContentCatalog,
): RouteSegmentDocument {
  const segment = world.routeSegments.find(
    (candidate) => candidate.id === segmentId,
  );

  if (segment === undefined) {
    throw new Error(`Unknown route segment: ${segmentId}`);
  }

  return segment;
}

function requireEvent(
  eventId: RouteEventId,
  world: WorldContentCatalog,
): RouteEventDocument {
  const event = world.routeEvents.find(
    (candidate) => candidate.id === eventId,
  );

  if (event === undefined) {
    throw new Error(`Unknown route event: ${eventId}`);
  }

  return event;
}

function requireBehavior(
  eventId: RouteEventId,
  experience: RouteExperienceCatalog,
): RouteEventBehavior {
  const event = experience.events.find(
    (candidate) => candidate.eventId === eventId,
  );

  if (event === undefined) {
    throw new Error(`Missing route event experience: ${eventId}`);
  }

  return event.behavior;
}

export function buildRouteEventTimeline(
  routeId: RouteId,
  worldInput: unknown,
  experienceInput: unknown,
): readonly RouteTimelineEvent[] {
  const world = validateWorldContentCatalog(worldInput);
  const experience = validateRouteExperienceCatalog(
    experienceInput,
    world,
  );
  const route = world.routes.find((candidate) => candidate.id === routeId);

  if (route === undefined) {
    throw new Error(`Unknown route: ${routeId}`);
  }

  let elapsedBeforeSegment = 0;
  const timeline: RouteTimelineEvent[] = [];

  for (const segmentId of route.data.segmentIds) {
    const segment = requireSegment(segmentId, world);

    for (const eventId of segment.data.eventIds) {
      const event = requireEvent(eventId, world);
      timeline.push({
        eventId,
        segmentId,
        hookId: event.data.hookId,
        routeElapsedMinutes:
          elapsedBeforeSegment +
          segment.data.durationMinutes * event.data.atProgress,
        behavior: requireBehavior(eventId, experience),
      });
    }

    elapsedBeforeSegment += segment.data.durationMinutes;
  }

  return timeline.sort(
    (left, right) =>
      left.routeElapsedMinutes - right.routeElapsedMinutes ||
      left.eventId.localeCompare(right.eventId),
  );
}
