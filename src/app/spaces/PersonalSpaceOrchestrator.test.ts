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

describe('PersonalSpaceOrchestrator', () => {
  it('transitions through authored spaces and refreshes live persistent flags', () => {
    let shownDefinition: PersonalSpaceDefinition | null = null;
    let shownResolver: PersonalSpaceFlagResolver | null = null;
    let refreshedResolver: PersonalSpaceFlagResolver | null = null;
    let taxiShows = 0;

    const presentation: PersonalSpacePresentationPort = {
      showPersonalSpace: (definition, resolveFlag) => {
        shownDefinition = definition;
        shownResolver = resolveFlag;
      },
      refreshPersonalSpaceFlags: (resolveFlag) => {
        refreshedResolver = resolveFlag;
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
    expect(shownDefinition?.id).toBe(garageId);

    if (shownResolver === null) {
      throw new Error('Expected personal-space flag resolver.');
    }

    expect(shownResolver('inspection-light')).toBe(false);

    flow.setFlag(garageId, 'inspection-light', true);

    if (refreshedResolver === null) {
      throw new Error('Expected refreshed flag resolver.');
    }

    expect(refreshedResolver('inspection-light')).toBe(true);

    flow.leaveForTaxi();

    expect(state.getCurrentSpaceId()).toBeNull();
    expect(taxiShows).toBe(1);
  });
});
