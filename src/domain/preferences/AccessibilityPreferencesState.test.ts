import { describe, expect, it, vi } from 'vitest';
import {
  AccessibilityPreferencesStore,
  AccessibilityPreferencesStateSchema,
  createInitialAccessibilityPreferencesState,
} from './AccessibilityPreferencesState';

describe('AccessibilityPreferencesStore', () => {
  it('starts from deterministic production defaults', () => {
    expect(
      createInitialAccessibilityPreferencesState(),
    ).toEqual({
      schemaVersion: 1,
      uiScale: 1,
      motionIntensity: 1,
      contrastMode: 'standard',
      focusIndicator: 'auto',
      pointerSensitivity: 1,
      touchSensitivity: 1,
    });
  });

  it('validates bounded readability, motion, and input preferences', () => {
    expect(() =>
      AccessibilityPreferencesStateSchema.parse({
        ...createInitialAccessibilityPreferencesState(),
        uiScale: 2,
      }),
    ).toThrow();

    expect(() =>
      AccessibilityPreferencesStateSchema.parse({
        ...createInitialAccessibilityPreferencesState(),
        motionIntensity: -0.1,
      }),
    ).toThrow();

    expect(() =>
      AccessibilityPreferencesStateSchema.parse({
        ...createInitialAccessibilityPreferencesState(),
        touchSensitivity: 0,
      }),
    ).toThrow();
  });

  it('publishes live immutable snapshots to presentation subscribers', () => {
    const store = new AccessibilityPreferencesStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setUiScale(1.25);
    store.setMotionIntensity(0.3);
    store.setContrastMode('high');
    unsubscribe();
    store.setUiScale(1.5);

    expect(listener).toHaveBeenCalledTimes(4);
    expect(listener.mock.calls.at(-1)?.[0]).toMatchObject({
      uiScale: 1.25,
      motionIntensity: 0.3,
      contrastMode: 'high',
    });
    expect(store.exportState().uiScale).toBe(1.5);
  });
});
