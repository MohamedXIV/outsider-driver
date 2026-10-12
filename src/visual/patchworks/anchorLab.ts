import { AnimatedAnchorTransitionController } from '../../app/presentation/AnimatedAnchorTransitionController';
import { createPatchworksStage, type PatchworksStage } from './createPatchworksStage';

const place = document.querySelector<HTMLElement>('#visual-stage');
const status = document.querySelector<HTMLElement>('#status');
const metrics = document.querySelector<HTMLElement>('#metrics');
const enterButton = document.querySelector<HTMLButtonElement>('#enter');
const exitButton = document.querySelector<HTMLButtonElement>('#exit');
const reduced = document.querySelector<HTMLInputElement>('#reduced-motion');

if (!place || !status || !metrics || !enterButton || !exitButton || !reduced) {
  throw new Error('Patchworks lab shell is incomplete.');
}
const stageHost = place;
const liveStatus = status;
const metricsHost = metrics;
const enter = enterButton;
const leave = exitButton;
const reducedMotion = reduced;

let lastStage: PatchworksStage | null = null;
let departureCount = 0;
let pauseCount = 0;
let resumeCount = 0;
let errorCount = 0;
const controller = new AnimatedAnchorTransitionController(
  {
    // Deliberately isolated probe fixture; this is NOT a GameSession adapter.
    authorizeArrival: (locationId) => {
      if (locationId !== 'location:patchworks-parts') {
        throw new Error('Lab fixture permits only the Patchworks location.');
      }
      return {
        locationId,
        districtId: 'district:outer-margin',
        returnToken: 'LAB-NOT-A-REAL-ARRIVAL',
      };
    },
    confirmDeparture: () => { departureCount++; },
  },
  {
    create: async (_arrival, signal) => {
      const result = await createPatchworksStage(signal, reducedMotion.checked);
      lastStage = result;
      return result;
    },
  },
  {
    suspend: () => {
      // There is no Babylon scene in the isolated lab. Count the transition.
      pauseCount++;
    },
    resume: () => { resumeCount++; },
  },
  {
    showLoading: () => {
      liveStatus.textContent = 'Loading animated stage…';
      stageHost.replaceChildren();
    },
    showScene: (canvas) => {
      canvas.setAttribute('aria-label', 'Animated Patchworks parts shop artwork');
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      stageHost.replaceChildren(canvas);
      liveStatus.textContent = 'Scene active. All transactions are disabled in this art lab.';
      enter.disabled = true;
      leave.disabled = false;
      leave.focus();
    },
    showError: (message) => {
      errorCount++;
      liveStatus.textContent = 'Scene failed: ' + message;
      enter.disabled = false;
      leave.disabled = true;
    },
    clear: () => {
      stageHost.replaceChildren();
      liveStatus.textContent = 'Scene closed. No game-world state was changed.';
      enter.disabled = false;
      leave.disabled = true;
    },
  },
);

const inspect = (): void => {
  const live = lastStage?.getMetrics();
  metricsHost.textContent = JSON.stringify({
    phase: controller.phase,
    pauseCount,
    departureCount,
    resumeCount,
    errorCount,
    ...(live ?? { updates: 0, fanAngle: 0, warmLightAlpha: 0 }),
  }, null, 2);
};
const onEnter = (): void => {
  enter.disabled = true;
  void controller.enter('location:patchworks-parts').then(
    () => { inspect(); },
    (error: unknown) => {
      liveStatus.textContent = error instanceof Error ? error.message : String(error);
      enter.disabled = false;
    },
  );
};
const onExit = (): void => {
  try {
    controller.exit();
    inspect();
  } catch (error: unknown) {
    liveStatus.textContent = error instanceof Error ? error.message : String(error);
  }
};
const onVisibility = (): void => {
  controller.setVisible(!document.hidden);
};
enter.addEventListener('click', onEnter);
leave.addEventListener('click', onExit);
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener('pagehide', () => { controller.dispose(); }, { once: true });
if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => { controller.dispose(); });
}

Reflect.set(window, '__outsiderPatchworksLab', {
  inspect: () => {
    inspect();
    return {
      phase: controller.phase, pauseCount, departureCount, resumeCount, errorCount,
      ...(lastStage?.getMetrics() ?? { updates: 0, fanAngle: 0 }),
    };
  },
  enter: () => controller.enter('location:patchworks-parts'),
  exit: () => controller.exit(),
});
inspect();
