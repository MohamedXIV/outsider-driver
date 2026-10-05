import type { BrowserRuntimeSupportReport } from '../platform/BrowserRuntimeSupport';

export interface UnsupportedBrowserSurface {
  dispose(): void;
}

const capabilityLabels = {
  webgl: 'WebGL graphics',
  webassembly: 'WebAssembly runtime support',
} as const;

export function createUnsupportedBrowserSurface(
  root: HTMLElement,
  report: BrowserRuntimeSupportReport,
): UnsupportedBrowserSurface {
  if (report.supported) {
    throw new Error(
      'Unsupported-browser surface requires a failed compatibility report.',
    );
  }

  const shell = document.createElement('main');
  shell.className =
    'game-shell game-compatibility-shell';

  const panel = document.createElement('section');
  panel.className = 'game-compatibility-panel';
  panel.setAttribute('role', 'alert');
  panel.setAttribute('aria-live', 'assertive');

  const heading = document.createElement('h1');
  heading.textContent = 'This browser cannot run Outsider Driver';

  const explanation = document.createElement('p');
  explanation.textContent =
    'The web version requires browser graphics and runtime features that are unavailable in this session.';

  const missingHeading = document.createElement('p');
  missingHeading.textContent = 'Missing required capability:';

  const list = document.createElement('ul');

  for (const capability of report.missing) {
    const item = document.createElement('li');
    item.textContent = capabilityLabels[capability];
    list.append(item);
  }

  const guidance = document.createElement('p');
  guidance.textContent =
    'Use a supported current browser with hardware acceleration enabled. Your save data has not been changed.';

  panel.append(
    heading,
    explanation,
    missingHeading,
    list,
    guidance,
  );
  shell.append(panel);
  root.replaceChildren(shell);

  return {
    dispose: (): void => {
      root.replaceChildren();
    },
  };
}
