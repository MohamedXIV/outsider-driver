import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { BabylonRenderingRuntime } from '../../BabylonRenderingRuntime';
import type { AccessibilityPreferencesStore } from '../../../domain/preferences/AccessibilityPreferencesState';
import type { NarrativeTurn } from '../../../narrative/contracts/NarrativePresentation';
import type { NarrativeQueryPort, NarrativeEventSink } from '../../../narrative/contracts/NarrativeBoundary';
import { resolvePassengerPerformanceCue } from '../../../app/rides/PassengerPerformancePresentation';
import { InkNarrativeRuntime } from '../../../narrative/InkNarrativeRuntime';
import foundationInk from '../../../content/narrative/foundation-passenger.ink?raw';
import {
  SPRITE_MODES,
  SpritePassengerCandidate,
  type SpriteEvaluationMode,
} from './SpritePassengerCandidate';
import { ALIEN_EXPRESSIONS } from './AlienPortraitArt';
import { MintElfPassengerCandidate } from './MintElfPassengerCandidate';

function element<K extends keyof HTMLElementTagNameMap>(
  type: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(type);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function select(
  label: string,
  choices: readonly { value: string; label: string }[],
  value: string,
  update: (value: string) => void,
): HTMLElement {
  const container = element('label', 'sprite-viewer-field', label);
  const dropdown = element('select', 'sprite-viewer-select');
  for (const choice of choices) {
    const option = document.createElement('option');
    option.value = choice.value;
    option.textContent = choice.label;
    dropdown.add(option);
  }
  dropdown.value = value;
  dropdown.addEventListener('change', () => { update(dropdown.value); });
  container.append(dropdown);
  return container;
}

function range(
  label: string,
  min: number,
  max: number,
  initial: number,
  update: (value: number) => void,
): HTMLElement {
  const container = element('label', 'sprite-viewer-field', label);
  const line = element('div', 'sprite-viewer-range');
  const input = element('input', '');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '0.05';
  input.value = String(initial);
  const output = element('output', '', initial.toFixed(2));
  input.addEventListener('input', () => {
    const value = Number(input.value);
    output.value = value.toFixed(2);
    update(value);
  });
  line.append(input, output);
  container.append(line);
  return container;
}

/**
 * Mounts in the already-running Babylon taxi scene. This is a developer
 * sandbox: Ink events are observed, NEVER committed to GameSession/saves.
 */
export function mountSpriteComparison(
  root: HTMLElement,
  rendering: BabylonRenderingRuntime,
  preferences: AccessibilityPreferencesStore,
  onClosed: () => void,
): () => void {
  let taxi = rendering.getTaxiScene();
  if (taxi === null) {
    rendering.showTaxi();
    taxi = rendering.getTaxiScene();
  }
  if (taxi === null) throw new Error('Sprite viewer requires the Babylon taxi scene.');

  const activeTaxi = taxi;
  const scene = activeTaxi.scene;
  const camera = activeTaxi.camera;
  const originalPosition = camera.position.clone();
  const originalRotation = camera.rotation.clone();
  const originalFov = camera.fov;
  const originalCabinIntensity = activeTaxi.cabinLight.intensity;
  const originalAmbientIntensity = activeTaxi.ambientLight.intensity;
  const originalCabinColor = activeTaxi.cabinLight.diffuse.clone();

  const neon = new PointLight('sprite-evaluation-neon', new Vector3(0, 1.5, 0), scene);
  neon.parent = activeTaxi.anchors.passengerLighting;
  neon.diffuse = new Color3(0.55, 0.3, 1);
  neon.intensity = 0;

  const candidates = new Map<SpriteEvaluationMode, SpritePassengerCandidate>();
  for (const mode of SPRITE_MODES) {
    candidates.set(mode, new SpritePassengerCandidate(scene, activeTaxi.anchors.passengerSeat, mode));
  }
  let current: SpriteEvaluationMode = 'layered';
  let activeArt: 'demo-alien' | 'mint-elf' = 'demo-alien';
  const mintCandidates = new Map<SpriteEvaluationMode, MintElfPassengerCandidate>();
  const applyMode = (mode: SpriteEvaluationMode): void => {
    current = mode;
    for (const [key, candidate] of candidates) {
      candidate.root.setEnabled(activeArt === 'demo-alien' && key === mode);
    }
    for (const [key, candidate] of mintCandidates) {
      candidate.root.setEnabled(activeArt === 'mint-elf' && key === mode);
    }
  };
  applyMode(current);
  const activeCandidates = (): ReadonlyMap<SpriteEvaluationMode, SpritePassengerCandidate | MintElfPassengerCandidate> =>
    activeArt === 'mint-elf' ? mintCandidates : candidates;

  const panel = element('aside', 'sprite-viewer');
  panel.setAttribute('aria-label', 'Passenger sprite animation comparison');
  const header = element('div', 'sprite-viewer-header');
  const title = element('h2', '', 'PASSENGER LAB / 01');
  const closeButton = element('button', 'sprite-viewer-close', '✕ Close');
  closeButton.type = 'button';
  header.append(title, closeButton);
  const intro = element('p', 'sprite-viewer-intro',
    'Compare the original test character or the user-art mint elf inside Babylon. Mint elf cutouts are provisional; facial movement is not yet supported.');
  const controls = element('div', 'sprite-viewer-controls');
  const details = element('div', 'sprite-viewer-metrics');
  const artStatus = element('p', 'sprite-viewer-asset-status', 'Original comparison art ready');
  artStatus.setAttribute('role', 'status');
  const artNotice = element('p', 'sprite-viewer-note', '');
  const transcript = element('section', 'sprite-viewer-dialogue');
  transcript.setAttribute('aria-label', 'Real Ink dialogue');
  const dialogueHeading = element('h3', '', 'INK / CHECKPOINT CONVERSATION');
  const dialogueContent = element('div', 'sprite-viewer-dialogue-content');
  const choiceContainer = element('div', 'sprite-viewer-choices');
  const startDialogue = element('button', 'sprite-viewer-action', 'Restart Ink dialogue');
  startDialogue.type = 'button';
  transcript.append(dialogueHeading, dialogueContent, choiceContainer, startDialogue);

  function applyToAll(callback: (candidate: SpritePassengerCandidate | MintElfPassengerCandidate) => void): void {
    for (const candidate of activeCandidates().values()) callback(candidate);
  }
  function refreshMetrics(): void {
    const model = activeCandidates().get(current);
    if (!model) return;
    const metrics = model.metrics();
    details.textContent = `${String(metrics.meshes)} transparent planes · ${(metrics.decodedTextureBytes / (1024 * 1024)).toFixed(2)} MiB estimated decoded RGBA texture size · ${String(metrics.meshes)} potential draw calls`;
    const elf = mintCandidates.get(current);
    artStatus.textContent = activeArt === 'mint-elf'
      ? elf?.status === 'ready' ? 'Mint elf artwork loaded'
        : elf?.status === 'failed' ? 'ERROR: Mint elf artwork failed to load'
          : 'Loading original mint elf WebP artwork…'
      : 'Original comparison art ready';
  }
  function setFraming(value: string): void {
    if (value === 'driver') {
      camera.position.copyFrom(originalPosition);
      camera.rotation.copyFrom(originalRotation);
      camera.fov = originalFov;
    } else {
      camera.position.copyFromFloats(
        value === 'close' ? 0.48 : 0.10,
        value === 'close' ? 1.48 : 1.39,
        value === 'close' ? -0.05 : 0.32,
      );
      camera.setTarget(new Vector3(0.68, 1.23, -0.92));
      camera.fov = value === 'close' ? 0.76 : 1.05;
    }
  }
  function setLighting(value: string): void {
    activeTaxi.cabinLight.intensity = originalCabinIntensity * (value === 'dim' ? 0.12 : 1);
    activeTaxi.ambientLight.intensity = originalAmbientIntensity * (value === 'dim' ? 0.18 : 1);
    activeTaxi.cabinLight.diffuse.copyFrom(originalCabinColor);
    neon.intensity = value === 'neon' ? 1.7 : 0;
  }

  controls.append(
    select('Passenger art', [
      { value: 'demo-alien', label: 'Original comparison drawing' },
      { value: 'mint-elf', label: 'Mint elf — extracted user artwork' },
    ], 'demo-alien', value => {
      if (value === 'mint-elf') {
        if (mintCandidates.size === 0) {
          for (const mode of SPRITE_MODES) {
            mintCandidates.set(mode, new MintElfPassengerCandidate(scene, activeTaxi.anchors.passengerSeat, mode));
          }
        }
        activeArt = 'mint-elf';
      } else {
        activeArt = 'demo-alien';
      }
      applyMode(current);
      updateArtControls();
      refreshMetrics();
      if (activeArt === 'mint-elf') {
        void Promise.all([...mintCandidates.values()].map(candidate => candidate.ready)).then(() => {
          if (activeArt === 'mint-elf') refreshMetrics();
        });
      }
    }),
    select('Animation renderer', SPRITE_MODES.map(mode => ({ value: mode, label:
      mode === 'spritesheet' ? 'A · Packed spritesheet' :
      mode === 'layered' ? 'B · Layered sprites' : 'C · Hybrid sprites',
    })), current, value => {
      if (!SPRITE_MODES.some(mode => mode === value)) return;
      applyMode(value as SpriteEvaluationMode);
      refreshMetrics();
    }),
    select('Expression', ALIEN_EXPRESSIONS.map(expression => ({value: expression, label: expression})),
      'neutral', value => { applyToAll(model => { model.setExpression(value); }); }),
    range('Talk intensity', 0, 1, 0, value => { applyToAll(model => { model.setTalk(value); }); }),
    range('Look left / right', -1, 1, 0, value => { applyToAll(model => { model.setGaze(value, 0); }); }),
    range('Head direction', -1, 1, 0, value => { applyToAll(model => { model.setHeadPose(value, 0); }); }),
    range('Body lean', -1, 1, 0, value => { applyToAll(model => { model.setBodyPose(value, 0); }); }),
    select('Camera framing', [
      { value: 'driver', label: 'Original driver POV (passenger behind you)' },
      { value: 'glance', label: 'Turn to passenger / seat view' },
      { value: 'close', label: 'Close portrait' },
    ], 'glance', setFraming),
    select('Taxi lighting', [
      {value: 'cabin', label: 'Warm cabin / night'},
      {value: 'dim', label: 'Deep night / low light'},
      {value: 'neon', label: 'Passing violet neon'},
    ], 'cabin', setLighting),
  );
  const blinkButton = element('button', 'sprite-viewer-action', 'Trigger blink');
  blinkButton.type = 'button';
  const neutralButton = element('button', 'sprite-viewer-action', 'Neutral pose');
  neutralButton.type = 'button';
  const actions = element('div', 'sprite-viewer-actions');
  actions.append(blinkButton, neutralButton);
  controls.append(actions);
  const notice = element('p', 'sprite-viewer-note',
    'Spritesheet: fixed full-face frames (gaze is not independently supported). Layered: body/head/antennae/eyes/mouth. Hybrid: pre-rendered body/head + live face layers. Motion reduction comes from game settings.');
  panel.append(header, intro, controls, artStatus, details, artNotice, notice, transcript);
  root.append(panel);

  function updateArtControls(): void {
    const unsupported = new Set(['Expression', 'Talk intensity', 'Look left / right']);
    for (const label of controls.querySelectorAll('label')) {
      const field = label.querySelector<HTMLInputElement | HTMLSelectElement>('input, select');
      if (field !== null && [...unsupported].some(name => label.textContent?.startsWith(name))) {
        field.disabled = activeArt === 'mint-elf';
      }
    }
    blinkButton.disabled = activeArt === 'mint-elf';
    artNotice.textContent = activeArt === 'mint-elf'
      ? 'MINT ELF PROTOTYPE: real uploaded user artwork. Only gentle body/head/antenna motion works. Eye, mouth, expression and blink remain baked into the source image; those controls are disabled. The cutout seams still need artwork repair.'
      : 'Original procedural alien supports facial controls. Mint elf is a source-art integration test, not a completed facial rig.';
  }
  updateArtControls();

  let blinkTimeout = 0;
  blinkButton.addEventListener('click', () => {
    window.clearTimeout(blinkTimeout);
    applyToAll(model => { model.setBlink(1); });
    blinkTimeout = window.setTimeout(() => { applyToAll(model => { model.setBlink(0); }); }, 220);
  });
  neutralButton.addEventListener('click', () => { applyToAll(model => { model.reset(); }); });

  let story: InkNarrativeRuntime | null = null;
  const facts = new Set<string>();
  const events: NarrativeEventSink = {
    emit: event => {
      if (event.type === 'knowledge.reveal') facts.add(event.factId);
    },
  };
  const queries: NarrativeQueryPort = {
    hasFact: factId => facts.has(factId),
    hasClaim: () => false,
    coverIdentityMatches: () => false,
    wouldContradictClaim: () => false,
    getPassengerSuspicion: () => 0,
    getCityAttention: () => 0,
  };
  function presentTurn(turn: NarrativeTurn): void {
    dialogueContent.replaceChildren();
    choiceContainer.replaceChildren();
    for (const line of turn.lines) {
      dialogueContent.append(element('p', 'sprite-viewer-line', line.text));
    }
    const cue = resolvePassengerPerformanceCue(turn);
    if (cue !== null) applyToAll(candidate => { candidate.applyCue(cue); });
    for (const choice of turn.choices) {
      const button = element('button', 'sprite-viewer-choice', choice.text);
      button.type = 'button';
      button.addEventListener('click', () => {
        if (story === null) return;
        try {
          presentTurn(story.choose(choice.index));
        } catch (error) {
          dialogueContent.textContent = String(error);
        }
      });
      choiceContainer.append(button);
    }
    if (turn.ended) choiceContainer.append(element('p', 'sprite-viewer-ended', 'END OF SCENE · Choose Restart to replay.'));
  }
  function resetDialogue(): void {
    facts.clear();
    applyToAll(candidate => { candidate.reset(); });
    try {
      story = InkNarrativeRuntime.fromInkSource(foundationInk, queries, events);
      presentTurn(story.continueUntilChoiceOrEnd());
    } catch (error) {
      dialogueContent.textContent = `Ink evaluation error: ${String(error)}`;
    }
  }
  startDialogue.addEventListener('click', resetDialogue);
  resetDialogue();
  setFraming('glance');
  refreshMetrics();

  let elapsed = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    elapsed += dt;
    const motion = preferences.getMotionIntensity();
    for (const candidate of activeCandidates().values()) candidate.update(dt, motion);
    if (elapsed >= 0.75) {
      elapsed = 0;
      refreshMetrics();
    }
  });
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(blinkTimeout);
    scene.onBeforeRenderObservable.remove(observer);
    for (const candidate of candidates.values()) candidate.dispose();
    for (const candidate of mintCandidates.values()) candidate.dispose();
    neon.dispose();
    camera.position.copyFrom(originalPosition);
    camera.rotation.copyFrom(originalRotation);
    camera.fov = originalFov;
    activeTaxi.cabinLight.intensity = originalCabinIntensity;
    activeTaxi.ambientLight.intensity = originalAmbientIntensity;
    activeTaxi.cabinLight.diffuse.copyFrom(originalCabinColor);
    panel.remove();
    onClosed();
  };
  closeButton.addEventListener('click', dispose);
  return dispose;
}
