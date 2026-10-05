import './styles.css';
import { GameApplication } from './app/GameApplication';
import { BrowserAccessibilityPreferencesPersistence } from './app/preferences/BrowserAccessibilityPreferencesPersistence';
import { AccessibilityPreferencesStore } from './domain/preferences/AccessibilityPreferencesState';
import { detectBrowserRuntimeSupport } from './platform/BrowserRuntimeSupport';
import { BabylonRenderingRuntime } from './rendering/BabylonRenderingRuntime';
import type { BabylonRenderingRuntime as BabylonRenderingRuntimeType } from './rendering/BabylonRenderingRuntime';
import { createGameSurface } from './ui/createGameSurface';
import { createUnsupportedBrowserSurface } from './ui/createUnsupportedBrowserSurface';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Application root #app was not found.');
}

type InochiProbeState =
  | { readonly status: 'pending' }
  | {
      readonly status: 'success';
      readonly summary: unknown;
    }
  | {
      readonly status: 'failure';
      readonly error: string;
    };

function publishInochiProbeState(state: InochiProbeState): void {
  Reflect.set(window, '__outsiderDriverInochiProbe', state);
}

async function runRequestedInochiProbe(): Promise<void> {
  const requested = new URLSearchParams(window.location.search)
    .get('inochiProbe');

  if (requested !== '1') {
    return;
  }

  publishInochiProbeState({ status: 'pending' });

  try {
    const { runInochiBrowserProbe } = await import(
      './rendering/passengers/runInochiBrowserProbe'
    );
    const summary = await runInochiBrowserProbe();
    publishInochiProbeState({
      status: 'success',
      summary,
    });
  } catch (error) {
    publishInochiProbeState({
      status: 'failure',
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}

type PersonalSpaceProbeState =
  | { readonly status: 'pending' }
  | {
      readonly status: 'success';
      readonly summary: unknown;
    }
  | {
      readonly status: 'failure';
      readonly error: string;
    };

function publishPersonalSpaceProbeState(
  state: PersonalSpaceProbeState,
): void {
  Reflect.set(
    window,
    '__outsiderDriverPersonalSpaceProbe',
    state,
  );
}

async function runRequestedPersonalSpaceProbe(
  rendering: BabylonRenderingRuntimeType,
): Promise<void> {
  const requested = new URLSearchParams(window.location.search)
    .get('spaceProbe');

  if (requested !== 'garage' && requested !== 'home') {
    return;
  }

  publishPersonalSpaceProbeState({ status: 'pending' });

  try {
    const { runPersonalSpaceBrowserProbe } = await import(
      './rendering/spaces/runPersonalSpaceBrowserProbe'
    );
    const summary = await runPersonalSpaceBrowserProbe(
      requested,
      rendering,
    );
    publishPersonalSpaceProbeState({
      status: 'success',
      summary,
    });
  } catch (error) {
    publishPersonalSpaceProbeState({
      status: 'failure',
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}

function bootstrapSupportedGame(
  applicationRoot: HTMLElement,
): () => void {
  const preferencesPersistence =
    new BrowserAccessibilityPreferencesPersistence();
  const preferences = new AccessibilityPreferencesStore(
    preferencesPersistence.load(),
  );
  const stopPreferencePersistence = preferences.subscribe(
    (state) => {
      preferencesPersistence.save(state);
    },
  );
  const surface = createGameSurface(
    applicationRoot,
    preferences,
  );
  const rendering = new BabylonRenderingRuntime(
    surface.canvas,
    preferences,
  );
  const application = new GameApplication(rendering);

  application.start();
  performance.mark('outsider-driver:startup-ready');
  void runRequestedInochiProbe();
  void runRequestedPersonalSpaceProbe(rendering);

  return (): void => {
    application.dispose();
    stopPreferencePersistence();
    surface.dispose();
  };
}

const compatibility = detectBrowserRuntimeSupport();
const disposeApplication = compatibility.supported
  ? bootstrapSupportedGame(root)
  : (() => {
      const unsupported = createUnsupportedBrowserSurface(
        root,
        compatibility,
      );

      return (): void => {
        unsupported.dispose();
      };
    })();

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => {
    disposeApplication();
  });
}
