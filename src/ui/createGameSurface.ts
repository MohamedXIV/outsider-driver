import type {
  AccessibilityPreferencesState,
  AccessibilityPreferencesStore,
} from '../domain/preferences/AccessibilityPreferencesState';

export interface GameSurface {
  readonly canvas: HTMLCanvasElement;
  readonly uiLayer: HTMLElement;
  dispose(): void;
}

function createRangeSetting(
  id: string,
  labelText: string,
  min: number,
  max: number,
  step: number,
): {
  readonly row: HTMLLabelElement;
  readonly input: HTMLInputElement;
  readonly output: HTMLOutputElement;
} {
  const row = document.createElement('label');
  row.className = 'game-settings-row';
  row.htmlFor = id;

  const label = document.createElement('span');
  label.textContent = labelText;

  const input = document.createElement('input');
  input.id = id;
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);

  const output = document.createElement('output');
  output.className = 'game-settings-value';
  output.htmlFor.add(id);

  row.append(label, input, output);

  return {
    row,
    input,
    output,
  };
}

function createSelectSetting(
  id: string,
  labelText: string,
  options: readonly {
    readonly value: string;
    readonly label: string;
  }[],
): {
  readonly row: HTMLLabelElement;
  readonly select: HTMLSelectElement;
} {
  const row = document.createElement('label');
  row.className = 'game-settings-row';
  row.htmlFor = id;

  const label = document.createElement('span');
  label.textContent = labelText;

  const select = document.createElement('select');
  select.id = id;

  for (const optionDefinition of options) {
    const option = document.createElement('option');
    option.value = optionDefinition.value;
    option.textContent = optionDefinition.label;
    select.append(option);
  }

  row.append(label, select);

  return {
    row,
    select,
  };
}

function formatPercent(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

export function createGameSurface(
  root: HTMLElement,
  preferences: AccessibilityPreferencesStore,
): GameSurface {
  const shell = document.createElement('main');
  shell.className = 'game-shell';

  const instructions = document.createElement('p');
  instructions.id = 'game-control-instructions';
  instructions.className = 'game-sr-only';
  instructions.textContent =
    'Game view. Press Escape to move keyboard focus to accessibility and control settings.';

  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvas.setAttribute('aria-label', 'Outsider Driver game view');
  canvas.setAttribute('aria-describedby', instructions.id);
  canvas.setAttribute('role', 'application');
  canvas.tabIndex = 0;

  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.className = 'game-settings-button';
  settingsButton.textContent = 'Settings';
  settingsButton.setAttribute(
    'aria-label',
    'Accessibility and controls settings',
  );
  settingsButton.setAttribute(
    'aria-controls',
    'game-accessibility-settings',
  );
  settingsButton.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('section');
  panel.id = 'game-accessibility-settings';
  panel.className = 'game-settings-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'game-settings-heading');

  const heading = document.createElement('h2');
  heading.id = 'game-settings-heading';
  heading.textContent = 'Accessibility and controls';

  const uiScale = createRangeSetting(
    'game-setting-ui-scale',
    'Interface scale',
    75,
    175,
    5,
  );
  const motion = createRangeSetting(
    'game-setting-motion-intensity',
    'Motion intensity',
    0,
    100,
    5,
  );
  const pointer = createRangeSetting(
    'game-setting-pointer-sensitivity',
    'Pointer look sensitivity',
    25,
    200,
    5,
  );
  const touch = createRangeSetting(
    'game-setting-touch-sensitivity',
    'Touch look sensitivity',
    25,
    200,
    5,
  );
  const contrast = createSelectSetting(
    'game-setting-contrast',
    'Contrast',
    [
      {
        value: 'standard',
        label: 'Standard',
      },
      {
        value: 'high',
        label: 'High contrast',
      },
    ],
  );
  const focusIndicator = createSelectSetting(
    'game-setting-focus-indicator',
    'Focus indicator',
    [
      {
        value: 'auto',
        label: 'When keyboard navigation needs it',
      },
      {
        value: 'always',
        label: 'Always visible',
      },
    ],
  );

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'game-settings-close';
  closeButton.textContent = 'Close settings';

  panel.append(
    heading,
    uiScale.row,
    motion.row,
    contrast.row,
    focusIndicator.row,
    pointer.row,
    touch.row,
    closeButton,
  );

  const uiLayer = document.createElement('div');
  uiLayer.className = 'game-ui-layer';
  shell.append(
    instructions,
    canvas,
    uiLayer,
    settingsButton,
    panel,
  );
  root.replaceChildren(shell);

  const closePanel = (): void => {
    panel.hidden = true;
    settingsButton.setAttribute('aria-expanded', 'false');
    settingsButton.focus();
  };

  const openPanel = (): void => {
    panel.hidden = false;
    settingsButton.setAttribute('aria-expanded', 'true');
    uiScale.input.focus();
  };

  const togglePanel = (): void => {
    if (panel.hidden) {
      openPanel();
    } else {
      closePanel();
    }
  };

  const onCanvasKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    settingsButton.focus();
  };

  const onPanelKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    closePanel();
  };

  settingsButton.addEventListener('click', togglePanel);
  closeButton.addEventListener('click', closePanel);
  canvas.addEventListener('keydown', onCanvasKeydown);
  panel.addEventListener('keydown', onPanelKeydown);

  uiScale.input.addEventListener('input', () => {
    preferences.setUiScale(
      Number(uiScale.input.value) / 100,
    );
  });
  motion.input.addEventListener('input', () => {
    preferences.setMotionIntensity(
      Number(motion.input.value) / 100,
    );
  });
  pointer.input.addEventListener('input', () => {
    preferences.setPointerSensitivity(
      Number(pointer.input.value) / 100,
    );
  });
  touch.input.addEventListener('input', () => {
    preferences.setTouchSensitivity(
      Number(touch.input.value) / 100,
    );
  });
  contrast.select.addEventListener('change', () => {
    const next =
      contrast.select.value === 'high'
        ? 'high'
        : 'standard';
    preferences.setContrastMode(next);
  });
  focusIndicator.select.addEventListener('change', () => {
    const next =
      focusIndicator.select.value === 'always'
        ? 'always'
        : 'auto';
    preferences.setFocusIndicator(next);
  });

  const applyPreferences = (
    state: AccessibilityPreferencesState,
  ): void => {
    shell.style.setProperty(
      '--game-ui-scale',
      String(state.uiScale),
    );
    shell.style.setProperty(
      '--game-motion-intensity',
      String(state.motionIntensity),
    );
    shell.dataset.contrast = state.contrastMode;
    shell.dataset.focusIndicator = state.focusIndicator;

    uiScale.input.value = String(
      Math.round(state.uiScale * 100),
    );
    uiScale.output.value = formatPercent(state.uiScale);
    motion.input.value = String(
      Math.round(state.motionIntensity * 100),
    );
    motion.output.value = formatPercent(
      state.motionIntensity,
    );
    pointer.input.value = String(
      Math.round(state.pointerSensitivity * 100),
    );
    pointer.output.value = formatPercent(
      state.pointerSensitivity,
    );
    touch.input.value = String(
      Math.round(state.touchSensitivity * 100),
    );
    touch.output.value = formatPercent(
      state.touchSensitivity,
    );
    contrast.select.value = state.contrastMode;
    focusIndicator.select.value = state.focusIndicator;
  };

  const unsubscribe = preferences.subscribe(applyPreferences);

  return {
    canvas,
    uiLayer,
    dispose: (): void => {
      unsubscribe();
      settingsButton.removeEventListener(
        'click',
        togglePanel,
      );
      closeButton.removeEventListener('click', closePanel);
      canvas.removeEventListener(
        'keydown',
        onCanvasKeydown,
      );
      panel.removeEventListener(
        'keydown',
        onPanelKeydown,
      );
      root.replaceChildren();
    },
  };
}
