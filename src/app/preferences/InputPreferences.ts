import * as z from 'zod';
import type { AccessibilityPreferencesState } from '../../domain/preferences/AccessibilityPreferencesState';

const finiteDeltaSchema = z
  .number()
  .refine(Number.isFinite, {
    message: 'Input delta must be finite.',
  });

export interface PointerDelta {
  readonly x: number;
  readonly y: number;
}

export function scalePointerDelta(
  deltaInput: PointerDelta,
  source: 'pointer' | 'touch',
  preferences: AccessibilityPreferencesState,
): PointerDelta {
  const x = finiteDeltaSchema.parse(deltaInput.x);
  const y = finiteDeltaSchema.parse(deltaInput.y);
  const sensitivity =
    source === 'pointer'
      ? preferences.pointerSensitivity
      : preferences.touchSensitivity;

  return {
    x: x * sensitivity,
    y: y * sensitivity,
  };
}
