import './styles.css';
import { GameApplication } from './app/GameApplication';
import { BrowserGameSaveStorage } from './app/session/BrowserGameSaveStorage';
import { GameSession } from './app/session/GameSession';
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
  // Hydrate before constructing graphics; never overwrite an invalid save.
  const session = GameSession.open(new BrowserGameSaveStorage());
  const preferencesPersistence =
    new BrowserAccessibilityPreferencesPersistence();
  const preferences = new AccessibilityPreferencesStore(
    session.wasRestored()
      ? session.exportState().accessibilityPreferences
      : preferencesPersistence.load(),
  );
  let stopPreferencePersistence = (): void => {};
  let surface: ReturnType<typeof createGameSurface> | null = null;
  let rendering: BabylonRenderingRuntime | null = null;
  let application: GameApplication | null = null;

  try {
    stopPreferencePersistence = preferences.subscribe((state) => {
      // The session save is canonical. Keep the older preferences key
      // synchronized for compatibility with existing installs.
      session.execute({ type: 'preferences.update', preferences: state });
      preferencesPersistence.save(state);
    });
    surface = createGameSurface(applicationRoot, preferences);
    rendering = new BabylonRenderingRuntime(surface.canvas, preferences);
    application = new GameApplication(rendering, session);
    application.start();

    performance.mark('outsider-driver:startup-ready');
    void runRequestedInochiProbe();
    void runRequestedPersonalSpaceProbe(rendering);
  } catch (error: unknown) {
    stopPreferencePersistence();
    if (application !== null) {
      application.dispose();
    } else {
      rendering?.dispose();
      session.dispose();
    }
    surface?.dispose();
    throw error;
  }

  const activeApplication = application;
  const activeSurface = surface;

  return (): void => {
    activeApplication.dispose();
    stopPreferencePersistence();
    activeSurface.dispose();
  };
}

function showStartupFailure(
  applicationRoot: HTMLElement,
  error: unknown,
): () => void {
  const shell = document.createElement('main');
  shell.className = 'game-shell game-compatibility-shell';
  const panel = document.createElement('section');
  panel.className = 'game-compatibility-panel';
  panel.setAttribute('role', 'alert');

  const heading = document.createElement('h1');
  heading.textContent = 'Unable to start Outsider Driver';
  const explanation = document.createElement('p');
  explanation.textContent =
    'The saved game could not be loaded or saved safely. Existing save data has not been deleted. Avoid clearing site storage; keep a copy for recovery.';
  const detail = document.createElement('p');
  detail.textContent = error instanceof Error ? error.message : String(error);
  panel.append(heading, explanation, detail);
  shell.append(panel);
  applicationRoot.replaceChildren(shell);

  return (): void => {
    applicationRoot.replaceChildren();
  };
}

const compatibility = detectBrowserRuntimeSupport();
let disposeApplication: () => void;

if (!compatibility.supported) {
  const unsupported = createUnsupportedBrowserSurface(root, compatibility);
  disposeApplication = (): void => {
    unsupported.dispose();
  };
} else {
  try {
    disposeApplication = bootstrapSupportedGame(root);
  } catch (error: unknown) {
    disposeApplication = showStartupFailure(root, error);
  }
}

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => {
    disposeApplication();
  });
}
