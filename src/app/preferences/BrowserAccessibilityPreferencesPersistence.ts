import {
  AccessibilityPreferencesStateSchema,
  createInitialAccessibilityPreferencesState,
  type AccessibilityPreferencesState,
} from '../../domain/preferences/AccessibilityPreferencesState';

export const ACCESSIBILITY_PREFERENCES_STORAGE_KEY =
  'outsider-driver.accessibility-preferences.v1';

export interface AccessibilityPreferencesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class BrowserAccessibilityPreferencesPersistence {
  readonly #storage: AccessibilityPreferencesStorage;

  public constructor(
    storage: AccessibilityPreferencesStorage = window.localStorage,
  ) {
    this.#storage = storage;
  }

  public load(): AccessibilityPreferencesState {
    const serialized = this.#storage.getItem(
      ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
    );

    if (serialized === null) {
      return createInitialAccessibilityPreferencesState();
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      return AccessibilityPreferencesStateSchema.parse(parsed);
    } catch {
      this.#storage.removeItem(
        ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
      );
      return createInitialAccessibilityPreferencesState();
    }
  }

  public save(stateInput: unknown): void {
    const state =
      AccessibilityPreferencesStateSchema.parse(stateInput);

    this.#storage.setItem(
      ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(state),
    );
  }
}
