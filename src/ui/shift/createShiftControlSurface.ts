import { productionContent } from '../../content/production/ProductionContent';
import type { JobId } from '../../domain/ids/EntityId';
import type { GameSession } from '../../app/session/GameSession';
import type { PlayerShiftController } from '../../app/shift/PlayerShiftController';

export interface ShiftControlSurface {
  dispose(): void;
}

function button(label: string, action: () => void): HTMLButtonElement {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'shift-control-button';
  item.textContent = label;
  item.addEventListener('click', action);
  return item;
}

function getPassengerName(id: string): string {
  return productionContent.passengers.passengers.find(
    (passenger) => passenger.id === id,
  )?.data.displayName ?? 'Unknown passenger';
}

export function createShiftControlSurface(
  mount: HTMLElement,
  session: GameSession,
  navigation: PlayerShiftController,
): ShiftControlSurface {
  const panel = document.createElement('section');
  panel.className = 'shift-controls';
  panel.setAttribute('aria-label', 'Shift navigation and dispatch');
  const heading = document.createElement('h1');
  heading.textContent = 'OUTSIDER / SHIFT';
  heading.className = 'shift-controls-heading';
  const status = document.createElement('p');
  status.className = 'shift-controls-status';
  status.setAttribute('aria-live', 'polite');
  const actionError = document.createElement('p');
  actionError.className = 'shift-control-error';
  actionError.setAttribute('role', 'alert');
  actionError.hidden = true;
  const actions = document.createElement('div');
  actions.className = 'shift-control-actions';
  const dispatch = document.createElement('details');
  dispatch.className = 'shift-work-board';
  const summary = document.createElement('summary');
  summary.textContent = 'DISPATCH / AVAILABLE WORK';
  dispatch.append(summary);
  const offers = document.createElement('div');
  offers.className = 'shift-work-offers';
  dispatch.append(offers);
  panel.append(heading, status, actionError, actions, dispatch);
  mount.append(panel);

  let selectedJobId: JobId | null = null;
  let disposed = false;

  const runAction = (action: () => void): void => {
    actionError.hidden = true;
    actionError.textContent = '';
    try {
      action();
    } catch (error: unknown) {
      actionError.textContent = error instanceof Error ? error.message : String(error);
      actionError.hidden = false;
    }
  };

  const update = (): void => {
    if (disposed) return;
    const state = navigation.getSnapshot();
    const hours = String(Math.floor(state.gameTime.minuteOfDay / 60)).padStart(2, '0');
    const minutes = String(state.gameTime.minuteOfDay % 60).padStart(2, '0');
    status.textContent =
      `${state.location.toUpperCase()} / DAY ${String(state.gameTime.day)} / ${hours}:${minutes} / ${String(state.credits)} CR`;

    actions.replaceChildren();
    if (state.location === 'home') {
      actions.append(button('Go to garage', () => runAction(() => navigation.goToGarage())));
    } else if (state.location === 'garage') {
      actions.append(
        button('Enter taxi', () => runAction(() => navigation.enterTaxi())),
        button('Return home', () => runAction(() => navigation.goHome())),
        button(
          state.inspectionLight ? 'Turn inspection light off' : 'Turn inspection light on',
          () => runAction(() => navigation.setInspectionLight(!state.inspectionLight)),
        ),
      );
    } else {
      actions.append(button('Return to garage', () => runAction(() => navigation.goToGarage())));
    }

    offers.replaceChildren();
    const available = session.listAvailableWork();
    if (available.length === 0) {
      const none = document.createElement('p');
      none.textContent = 'No eligible offers at this time.';
      offers.append(none);
      selectedJobId = null;
    }
    for (const { job } of available) {
      const item = document.createElement('article');
      item.className = 'shift-work-item';
      const name = document.createElement('h2');
      name.textContent = getPassengerName(job.passengerId);
      const meta = document.createElement('p');
      meta.textContent = `${job.source.kind.toUpperCase()} · Base ${String(job.fare.baseCredits)} CR · +${String(job.fare.perMinuteCredits)} CR/min`;
      const inspect = button(
        selectedJobId === job.id ? 'Hide details' : 'Inspect offer',
        () => {
          selectedJobId = selectedJobId === job.id ? null : job.id;
          update();
        },
      );
      item.append(name, meta, inspect);
      if (selectedJobId === job.id) {
        const details = document.createElement('p');
        details.textContent =
          `Route: ${job.pickupLocationId} → ${job.destinationLocationId}. ` +
          'Dispatch acceptance becomes available when the live ride lifecycle is connected.';
        item.append(details);
      }
      offers.append(item);
    }
  };

  // Rendering and UI are read-only session subscribers: all canonical changes
  // flow through typed GameSession commands, not DOM-local game state.
  const unsubscribe = session.subscribe(update);
  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      panel.remove();
    },
  };
}
