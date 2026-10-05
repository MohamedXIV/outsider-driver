import { describe, expect, it, vi } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { entityId } from '../../domain/ids/EntityId';
import { PersonalSpaceStateStore } from '../../domain/spaces/PersonalSpaceState';
import {
  PersonalSpaceOrchestrator,
  type PersonalSpaceFlagResolver,
  type PersonalSpacePresentationPort,
} from './PersonalSpaceOrchestrator';

describe('PersonalSpaceOrchestrator', () => {
  it('transitions through authored spaces and refreshes live persistent flags', () => {
    const showPersonalSpace = vi.fn();
    const refreshPersonalSpaceFlags = vi.fn();
    const showTaxi = vi.fn();
    const presentation: PersonalSpacePresentationPort = {
      showPersonalSpace,
      refreshPersonalSpaceFlags,
      showTaxi,
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
    expect(showPersonalSpace).toHaveBeenCalledTimes(1);

    const resolveFlag = showPersonalSpace.mock.calls[0]?.[1] as
      | PersonalSpaceFlagResolver
      | undefined;

    if (resolveFlag === undefined) {
      throw new Error('Expected personal-space flag resolver.');
    }

    expect(resolveFlag('inspection-light')).toBe(false);

    flow.setFlag(garageId, 'inspection-light', true);

    expect(refreshPersonalSpaceFlags).toHaveBeenCalledTimes(1);
    const refreshedResolver =
      refreshPersonalSpaceFlags.mock.calls[0]?.[0] as
        | PersonalSpaceFlagResolver
        | undefined;

    if (refreshedResolver === undefined) {
      throw new Error('Expected refreshed flag resolver.');
    }

    expect(refreshedResolver('inspection-light')).toBe(true);

    flow.leaveForTaxi();

    expect(state.getCurrentSpaceId()).toBeNull();
    expect(showTaxi).toHaveBeenCalledTimes(1);
  });
});
