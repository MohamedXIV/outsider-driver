import type { PersonalSpacePresentationPort } from '../../app/spaces/PersonalSpaceOrchestrator';
import { PersonalSpaceOrchestrator } from '../../app/spaces/PersonalSpaceOrchestrator';
import { productionContent } from '../../content/production/ProductionContent';
import { entityId } from '../../domain/ids/EntityId';
import { PersonalSpaceStateStore } from '../../domain/spaces/PersonalSpaceState';

export interface PersonalSpaceBrowserProbeSummary {
  readonly spaceId: string;
  readonly kind: 'garage' | 'home';
  readonly displayName: string;
  readonly visited: boolean;
  readonly currentSpaceId: string | null;
  readonly interactionKinds: readonly string[];
  readonly exercisedFlagId: string;
  readonly exercisedFlagValue: boolean;
}

export async function runPersonalSpaceBrowserProbe(
  kind: 'garage' | 'home',
  presentation: PersonalSpacePresentationPort,
): Promise<PersonalSpaceBrowserProbeSummary> {
  const state = new PersonalSpaceStateStore(
    productionContent.personalSpaces,
  );
  const flow = new PersonalSpaceOrchestrator(
    state,
    presentation,
  );
  const spaceId = entityId('personal-space', kind);
  const definition = flow.enter(spaceId);
  const flagId =
    kind === 'garage'
      ? 'inspection-light'
      : 'message-indicator';

  flow.setFlag(spaceId, flagId, true);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });

  return {
    spaceId,
    kind: definition.kind,
    displayName: definition.displayName,
    visited: state.hasVisited(spaceId),
    currentSpaceId: state.getCurrentSpaceId(),
    interactionKinds: definition.interactionAnchors.map(
      (anchor) => anchor.kind,
    ),
    exercisedFlagId: flagId,
    exercisedFlagValue: state.getFlag(spaceId, flagId),
  };
}
