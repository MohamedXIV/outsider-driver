import { describe, expect, it } from 'vitest';
import { createInitialAccessibilityPreferencesState } from '../../domain/preferences/AccessibilityPreferencesState';
import { scalePointerDelta } from './InputPreferences';

describe('scalePointerDelta', () => {
  it('uses independent pointer and touch sensitivity without changing input semantics', () => {
    const preferences = {
      ...createInitialAccessibilityPreferencesState(),
      pointerSensitivity: 1.5,
      touchSensitivity: 0.5,
    };

    expect(
      scalePointerDelta(
        { x: 4, y: -2 },
        'pointer',
        preferences,
      ),
    ).toEqual({
      x: 6,
      y: -3,
    });

    expect(
      scalePointerDelta(
        { x: 4, y: -2 },
        'touch',
        preferences,
      ),
    ).toEqual({
      x: 2,
      y: -1,
    });
  });
});
