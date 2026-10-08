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
  summary.textContent = 'DISPATCH / WORK NETWORK';
  dispatch.append(summary);
  const offers = document.createElement('div');
  offers.className = 'shift-work-offers';
  dispatch.append(offers);
  const identityForm = document.createElement('form');
  identityForm.className = 'shift-identity';
  const identityLabel = document.createElement('label');
  identityLabel.textContent = 'DRIVER ALIAS / COVER';
  identityLabel.htmlFor = 'shift-cover-name';
  const identityInput = document.createElement('input');
  identityInput.id = 'shift-cover-name';
  identityInput.type = 'text';
  identityInput.name = 'coverName';
  identityInput.maxLength = 120;
  identityInput.required = true;
  identityInput.placeholder = 'Choose your driver name';
  const identitySubmit = document.createElement('button');
  identitySubmit.type = 'submit';
  identitySubmit.className = 'shift-control-button';
  identitySubmit.textContent = 'Register driver';
  identityForm.append(identityLabel, identityInput, identitySubmit);
  identityForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(() => {
      session.execute({
        type: 'identity.register',
        displayName: identityInput.value,
      });
    });
  });
  panel.append(heading, status, actionError, identityForm, actions, dispatch);
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
    const identity = session.getProjection();
    status.textContent =
      `${state.location.toUpperCase()} / DAY ${String(state.gameTime.day)} / ${hours}:${minutes} / ${String(state.credits)} CR` +
      (identity.coverName === null ? '' : ` / ${identity.coverName}`);
    identityForm.hidden = identity.hasCoverIdentity;

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
    const ride = session.exportState().rideSession;
    if (ride !== null && ride.phase !== 'completed') {
      const active = document.createElement('p');
      active.className = 'shift-work-active';
      active.textContent =
        `ASSIGNED / ${ride.jobId} / ${ride.phase.toUpperCase()}`;
      offers.append(active);
      if (ride.phase === 'assigned') {
        offers.append(button('Pick up passenger', () => runAction(() =>
          session.execute({ type: 'ride.pickup' }),
        )));
      } else {
        const presentation = session.getRidePresentation();
        if (presentation?.dialogue !== null && presentation?.dialogue !== undefined) {
          for (const line of presentation.dialogue.lines) {
            const dialogueLine = document.createElement('p');
            dialogueLine.className = 'shift-dialogue-line';
            dialogueLine.textContent = line.text;
            offers.append(dialogueLine);
          }
          for (const choice of presentation.dialogue.choices) {
            offers.append(button(choice.text, () => runAction(() =>
              session.execute({
                type: 'ride.choose-dialogue',
                choiceIndex: choice.index,
              }),
            )));
          }
        }
        const progress = document.createElement('p');
        progress.textContent =
          'Route navigation / arrival integration is in progress.';
        offers.append(progress);
      }
      return;
    }
    const available = session.listWorkOffers();
    if (!available.some((entry) => entry.eligible)) {
      const none = document.createElement('p');
      none.textContent = 'No eligible offers right now. Locked work is listed below.';
      offers.append(none);
    }
    for (const { job, eligible, reasons } of available) {
      const item = document.createElement('article');
      item.className = 'shift-work-item';
      item.dataset.eligibility = eligible ? 'eligible' : 'locked';
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
      item.append(name, meta);
      const eligibility = document.createElement('p');
      eligibility.textContent = eligible
        ? 'Eligible — available for dispatch inspection'
        : `Locked — ${reasons.map((reason) => reason.startsWith('cover:')
          ? `missing credential: ${reason.slice(6)}`
          : reason.startsWith('availability:')
            ? reason.slice(13).replaceAll('-', ' ')
            : reason.replaceAll('-', ' ')).join(', ')}`;
      item.append(eligibility, inspect);
      if (selectedJobId === job.id) {
        const details = document.createElement('p');
        details.textContent =
          `Route: ${job.pickupLocationId} → ${job.destinationLocationId}.`;
        item.append(details);
        if (eligible && state.location === 'taxi') {
          item.append(button('Accept job', () => runAction(() =>
            session.execute({ type: 'ride.accept', jobId: job.id }),
          )));
        } else if (eligible) {
          const hint = document.createElement('p');
          hint.textContent = 'Enter the taxi to accept dispatch.';
          item.append(hint);
        }
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
