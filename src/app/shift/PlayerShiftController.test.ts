import { describe, expect, it, vi } from 'vitest';
import type {
  PersonalSpaceFlagResolver,
  PersonalSpacePresentationPort,
} from '../spaces/PersonalSpaceOrchestrator';
import type { PersonalSpaceDefinition } from '../../content/spaces/PersonalSpaceContracts';
import { GameSession } from '../session/GameSession';
import { PlayerShiftController } from './PlayerShiftController';

function harness(saved = false) {
  let persisted: ReturnType<GameSession['exportState']> | null = null;
  if (saved) {
    const initial = GameSession.open({ load: () => null, save: () => {} });
    persisted = initial.exportState();
    initial.dispose();
  }
  const showTaxi = vi.fn();
  const showPersonalSpace = vi.fn<(definition: PersonalSpaceDefinition, flag: PersonalSpaceFlagResolver) => void>();
  const refreshPersonalSpaceFlags = vi.fn<(resolver: PersonalSpaceFlagResolver) => void>();
  const session = GameSession.open({
    load: () => persisted,
    save: (state) => { persisted = state; },
  });
  const presentation: PersonalSpacePresentationPort = {
    showTaxi,
    showPersonalSpace,
    refreshPersonalSpaceFlags,
  };
  const controller = new PlayerShiftController(session, presentation);
  return { session, controller, showTaxi, showPersonalSpace, refreshPersonalSpaceFlags, getSaved: () => persisted };
}

describe('PlayerShiftController', () => {
  it('starts a new authentic shift at home, then transitions garage/taxi/home', () => {
    const x = harness();
    expect(x.controller.getSnapshot().location).toBe('home');
    expect(x.showPersonalSpace).toHaveBeenCalledTimes(1);
    expect(x.showPersonalSpace.mock.lastCall?.[0].kind).toBe('home');
    expect(x.getSaved()?.personalSpaceState.currentSpaceId).toBe('personal-space:home');

    expect(() => x.controller.enterTaxi()).toThrow(/garage/i);
    x.controller.goToGarage();
    expect(x.controller.getSnapshot().location).toBe('garage');
    expect(x.showPersonalSpace.mock.lastCall?.[0].kind).toBe('garage');

    x.controller.setInspectionLight(true);
    expect(x.controller.getSnapshot().inspectionLight).toBe(true);
    expect(x.refreshPersonalSpaceFlags).toHaveBeenCalledTimes(1);
    expect(x.refreshPersonalSpaceFlags.mock.lastCall?.[0]('inspection-light')).toBe(true);

    x.controller.enterTaxi();
    expect(x.showTaxi).toHaveBeenCalledTimes(1);
    expect(x.controller.getSnapshot().location).toBe('taxi');
    expect(() => x.controller.goHome()).toThrow(/garage/i);

    x.controller.goToGarage();
    expect(x.controller.getSnapshot().inspectionLight).toBe(true);
    x.controller.goHome();
    expect(x.controller.getSnapshot().location).toBe('home');

    x.controller.dispose();
    x.session.dispose();
  });

  it('resumes persisted taxi scene without resetting time/location', () => {
    const x = harness(true);
    expect(x.controller.getSnapshot().location).toBe('taxi');
    expect(x.showTaxi).toHaveBeenCalledTimes(1);
    expect(x.showPersonalSpace).not.toHaveBeenCalled();
    expect(x.getSaved()).toBeNull();
    x.controller.dispose();
    expect(() => x.controller.goToGarage()).toThrow(/disposed/i);
    x.session.dispose();
  });

  it('does not rebuild Babylon scenes for non-navigation commands', () => {
    const x = harness();
    x.session.execute({ type: 'radio.listen', listening: true });
    x.session.execute({ type: 'time.advance', minutes: 10 });
    expect(x.showPersonalSpace).toHaveBeenCalledTimes(1);
    expect(x.showTaxi).not.toHaveBeenCalled();
    x.controller.dispose();
    x.session.dispose();
  });
});
