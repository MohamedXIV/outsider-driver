import { describe, expect, it } from 'vitest';
import {
  ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
  BrowserAccessibilityPreferencesPersistence,
  type AccessibilityPreferencesStorage,
} from './BrowserAccessibilityPreferencesPersistence';

class MemoryStorage implements AccessibilityPreferencesStorage {
  readonly #items = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }

  public removeItem(key: string): void {
    this.#items.delete(key);
  }
}

describe('BrowserAccessibilityPreferencesPersistence', () => {
  it('round-trips the validated accessibility contract', () => {
    const storage = new MemoryStorage();
    const persistence =
      new BrowserAccessibilityPreferencesPersistence(storage);
    const state = {
      schemaVersion: 1,
      uiScale: 1.35,
      motionIntensity: 0.25,
      contrastMode: 'high' as const,
      focusIndicator: 'always' as const,
      pointerSensitivity: 1.5,
      touchSensitivity: 1.25,
    };

    persistence.save(state);

    expect(persistence.load()).toEqual(state);
  });

  it('recovers a corrupted browser preference record to safe defaults', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
      '{not valid json',
    );

    const persistence =
      new BrowserAccessibilityPreferencesPersistence(storage);

    expect(persistence.load()).toMatchObject({
      schemaVersion: 1,
      uiScale: 1,
      motionIntensity: 1,
      contrastMode: 'standard',
      focusIndicator: 'auto',
      pointerSensitivity: 1,
      touchSensitivity: 1,
    });
    expect(
      storage.getItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY),
    ).toBeNull();
  });
});
