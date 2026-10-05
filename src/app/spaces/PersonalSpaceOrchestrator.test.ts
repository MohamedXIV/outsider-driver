import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { entityId } from '../../domain/ids/EntityId';
import { PersonalSpaceStateStore } from '../../domain/spaces/PersonalSpaceState';
import type { PersonalSpaceDefinition } from '../../content/spaces/PersonalSpaceContracts';
import {
  PersonalSpaceOrchestrator,
  type PersonalSpaceFlagResolver,
  type PersonalSpacePresentationPort,
} from './PersonalSpaceOrchestrator';

interface ShownSpaceCall {
  readonly definition: PersonalSpaceDefinition;
  readonly resolveFlag: PersonalSpaceFlagResolver;
}

describe('PersonalSpaceOrchestrator', () => {
  it('transitions through authored spaces and refreshes live persistent flags', () => {
    const shownSpaces: ShownSpaceCall[] = [];
    const refreshedResolvers: PersonalSpaceFlagResolver[] = [];
    let taxiShows = 0;

    const presentation: PersonalSpacePresentationPort = {
      showPersonalSpace: (definition, resolveFlag) => {
        shownSpaces.push({
          definition,
          resolveFlag,
        });
      },
      refreshPersonalSpaceFlags: (resolveFlag) => {
        refreshedResolvers.push(resolveFlag);
      },
      showTaxi: () => {
        taxiShows += 1;
      },
    };
    const state = new PersonalSpaceStateStore(
      productionContent.personalSpaces,
    );
    const flow = new PersonalSpaceOrchestrator(
      state,
      presentation,
    );
    const garageId = entityId('personal-space', 'garage');

    const garage = flow.enter(garageId);

    expect(garage.kind).toBe('garage');
    expect(shownSpaces).toHaveLength(1);
    expect(shownSpaces[0]?.definition.id).toBe(garageId);

    const shownResolver = shownSpaces[0]?.resolveFlag;

    if (shownResolver === undefined) {
      throw new Error('Expected personal-space flag resolver.');
    }

    expect(shownResolver('inspection-light')).toBe(false);

    flow.setFlag(garageId, 'inspection-light', true);

    expect(refreshedResolvers).toHaveLength(1);
    const refreshedResolver = refreshedResolvers[0];

    if (refreshedResolver === undefined) {
      throw new Error('Expected refreshed flag resolver.');
    }

    expect(refreshedResolver('inspection-light')).toBe(true);

    flow.leaveForTaxi();

    expect(state.getCurrentSpaceId()).toBeNull();
    expect(taxiShows).toBe(1);
  });
});
