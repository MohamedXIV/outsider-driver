import * as z from 'zod';

export const ACCESSIBILITY_PREFERENCES_SCHEMA_VERSION = 1 as const;

export const ContrastModeSchema = z.enum([
  'standard',
  'high',
]);

export const FocusIndicatorModeSchema = z.enum([
  'auto',
  'always',
]);

export const AccessibilityPreferencesStateSchema = z
  .object({
    schemaVersion: z.literal(
      ACCESSIBILITY_PREFERENCES_SCHEMA_VERSION,
    ),
    uiScale: z.number().min(0.75).max(1.75),
    motionIntensity: z.number().min(0).max(1),
    contrastMode: ContrastModeSchema,
    focusIndicator: FocusIndicatorModeSchema,
    pointerSensitivity: z.number().min(0.25).max(2),
    touchSensitivity: z.number().min(0.25).max(2),
  })
  .strict();

export type AccessibilityPreferencesState = z.infer<
  typeof AccessibilityPreferencesStateSchema
>;

export type AccessibilityPreferenceListener = (
  state: AccessibilityPreferencesState,
) => void;

export function createInitialAccessibilityPreferencesState(): AccessibilityPreferencesState {
  return AccessibilityPreferencesStateSchema.parse({
    schemaVersion: ACCESSIBILITY_PREFERENCES_SCHEMA_VERSION,
    uiScale: 1,
    motionIntensity: 1,
    contrastMode: 'standard',
    focusIndicator: 'auto',
    pointerSensitivity: 1,
    touchSensitivity: 1,
  });
}

export class AccessibilityPreferencesStore {
  #state: AccessibilityPreferencesState;
  readonly #listeners = new Set<AccessibilityPreferenceListener>();

  public constructor(
    stateInput: unknown =
      createInitialAccessibilityPreferencesState(),
  ) {
    this.#state =
      AccessibilityPreferencesStateSchema.parse(stateInput);
  }

  public exportState(): AccessibilityPreferencesState {
    return AccessibilityPreferencesStateSchema.parse(
      this.#state,
    );
  }

  public getUiScale(): number {
    return this.#state.uiScale;
  }

  public getMotionIntensity(): number {
    return this.#state.motionIntensity;
  }

  public getPointerSensitivity(
    source: 'pointer' | 'touch',
  ): number {
    return source === 'pointer'
      ? this.#state.pointerSensitivity
      : this.#state.touchSensitivity;
  }

  public setUiScale(value: number): AccessibilityPreferencesState {
    return this.#patch({
      uiScale: value,
    });
  }

  public setMotionIntensity(
    value: number,
  ): AccessibilityPreferencesState {
    return this.#patch({
      motionIntensity: value,
    });
  }

  public setContrastMode(
    value: AccessibilityPreferencesState['contrastMode'],
  ): AccessibilityPreferencesState {
    return this.#patch({
      contrastMode: value,
    });
  }

  public setFocusIndicator(
    value: AccessibilityPreferencesState['focusIndicator'],
  ): AccessibilityPreferencesState {
    return this.#patch({
      focusIndicator: value,
    });
  }

  public setPointerSensitivity(
    value: number,
  ): AccessibilityPreferencesState {
    return this.#patch({
      pointerSensitivity: value,
    });
  }

  public setTouchSensitivity(
    value: number,
  ): AccessibilityPreferencesState {
    return this.#patch({
      touchSensitivity: value,
    });
  }

  public subscribe(
    listener: AccessibilityPreferenceListener,
  ): () => void {
    this.#listeners.add(listener);
    listener(this.exportState());

    return () => {
      this.#listeners.delete(listener);
    };
  }

  #patch(
    patch: Partial<AccessibilityPreferencesState>,
  ): AccessibilityPreferencesState {
    this.#state =
      AccessibilityPreferencesStateSchema.parse({
        ...this.#state,
        ...patch,
      });

    const snapshot = this.exportState();

    for (const listener of this.#listeners) {
      listener(snapshot);
    }

    return snapshot;
  }
}
