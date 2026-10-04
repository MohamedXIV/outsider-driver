export interface GameSurface {
  readonly canvas: HTMLCanvasElement;
  dispose(): void;
}

export function createGameSurface(root: HTMLElement): GameSurface {
  const shell = document.createElement('main');
  shell.className = 'game-shell';

  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvas.setAttribute('aria-label', 'Outsider Driver game view');
  canvas.setAttribute('role', 'application');
  canvas.tabIndex = 0;

  shell.append(canvas);
  root.replaceChildren(shell);

  return {
    canvas,
    dispose: (): void => {
      root.replaceChildren();
    },
  };
}
