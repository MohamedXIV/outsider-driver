import { Engine } from '@babylonjs/core/Engines/engine';
import { productionContent } from '../../content/production/ProductionContent';
import { createTaxiScene } from '../taxi/createTaxiScene';
import { BabylonInochiPassengerRenderer } from './BabylonInochiPassengerRenderer';
import { InochiPuppetSession } from './InochiPuppetSession';
import { compileInochiRenderProgram } from './InochiRenderProgram';
import { InochiWasmBindings } from './InochiWasmBindings';
import { OfficialInochiRuntimeAdapter } from './OfficialInochiRuntimeAdapter';
import { PassengerPerformanceController } from './PassengerPerformanceController';
import { PassengerLightingBridge } from './PassengerLighting';

export interface InochiBrowserProbeSummary {
  readonly puppetName: string;
  readonly puppetAuthor: string;
  readonly parameterCount: number;
  readonly parameterExercised: string | null;
  readonly parameterDescriptors: Readonly<Record<
    string,
    {
      readonly lowerBounds: readonly number[];
      readonly upperBounds: readonly number[];
      readonly value: readonly number[];
    }
  >>;
  readonly directGazeWriteReadback: readonly number[] | null;
  readonly performanceCueApplied: string | null;
  readonly performanceValues: Readonly<Record<string, readonly number[]>>;
  readonly lightingApplied: boolean;
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly textureCount: number;
  readonly commandCount: number;
  readonly drawStates: readonly string[];
  readonly blendModes: readonly string[];
  readonly maskLayerCount: number;
  readonly maximumMaskDepth: number;
  readonly maximumCompositeDepth: number;
  readonly taxiPassengerSeatAnchor: string;
  readonly taxiRenderAttempted: boolean;
  readonly taxiRenderSucceeded: boolean;
  readonly taxiRenderError: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function reportStage(stage: string): void {
  console.info(`INOCHI_STAGE:${stage}`);
  Reflect.set(
    window,
    '__outsiderDriverInochiProbeStage',
    stage,
  );
}

async function loadFixture(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load Inochi fixture ${url}: HTTP ${String(response.status)}.`,
    );
  }

  return response.arrayBuffer();
}

export async function runInochiBrowserProbe(): Promise<InochiBrowserProbeSummary> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '640px',
    height: '640px',
    pointerEvents: 'none',
  });
  document.body.append(canvas);

  const engine = new Engine(
    canvas,
    true,
    {
      preserveDrawingBuffer: true,
      stencil: true,
    },
    true,
  );
  const taxi = createTaxiScene(
    engine,
    productionContent.taxiScene,
  );
  let bindings: InochiWasmBindings | null = null;
  let session: InochiPuppetSession | null = null;
  let renderer: BabylonInochiPassengerRenderer | null = null;

  try {
    reportStage('wasm-create-start');
    bindings = await InochiWasmBindings.create();
    reportStage('wasm-created');

    const runtime = new OfficialInochiRuntimeAdapter(bindings);

    reportStage('empty-load-start');
    const emptySession = await InochiPuppetSession.load(
      runtime,
      {
        id: 'inochi2d-upstream-empty08',
        load: () => loadFixture('/__fixtures__/empty08.inx'),
      },
    );
    emptySession.dispose();
    reportStage('empty-loaded');

    reportStage('mesh-load-start');
    const meshSession = await InochiPuppetSession.load(
      runtime,
      {
        id: 'outsider-driver-tiny-mesh08',
        load: () => loadFixture('/__fixtures__/tiny-mesh08.inx'),
      },
    );
    meshSession.dispose();
    reportStage('mesh-loaded');

    reportStage('puppet-load-start');
    session = await InochiPuppetSession.load(runtime, {
      id: 'outsider-driver-tiny-visual08',
      load: () => loadFixture('/__fixtures__/tiny-visual08.inx'),
    });

    reportStage('puppet-loaded');
    reportStage('parameters-start');
    const parameters = session.listParameters();
    const parameterDescriptors = Object.fromEntries(
      parameters.map((parameter) => [
        parameter.name,
        {
          lowerBounds: [...parameter.lowerBounds],
          upperBounds: [...parameter.upperBounds],
          value: [...parameter.value],
        },
      ]),
    );
    const gazeDescriptor = parameters.find(
      (parameter) => parameter.name === 'Gaze',
    );
    let directGazeWriteReadback: readonly number[] | null = null;

    if (gazeDescriptor !== undefined) {
      session.setParameter('Gaze', [-0.25, 0.05]);
      directGazeWriteReadback =
        session
          .listParameters()
          .find((parameter) => parameter.name === 'Gaze')
          ?.value ?? null;
      session.setParameter('Gaze', gazeDescriptor.value);
    }

    reportStage('parameter-diagnostic-complete');
    reportStage('parameters-loaded');
    const firstParameter = parameters[0];
    let parameterExercised: string | null = null;

    if (firstParameter !== undefined) {
      session.setParameter(
        firstParameter.name,
        firstParameter.value,
      );
      parameterExercised = firstParameter.name;
    }

    const performanceProfile =
      productionContent.passengerPerformance.profiles[0];
    const performance = new PassengerPerformanceController(
      session,
      performanceProfile,
    );
    performance.applyCue('guarded');
    const performanceCueApplied = 'guarded';

    const performanceValues = Object.fromEntries(
      session
        .listParameters()
        .map((parameter) => [
          parameter.name,
          [...parameter.value],
        ]),
    );

    reportStage('frame-start');
    const frame = session.frame(1 / 60);
    reportStage('frame-built');

    const program = compileInochiRenderProgram(frame);
    reportStage('render-program-built');
    let taxiRenderSucceeded = false;
    let taxiRenderError: string | null = null;

    renderer = new BabylonInochiPassengerRenderer(
      taxi.scene,
      taxi.anchors.passengerSeat,
    );
    const lighting = new PassengerLightingBridge(
      taxi,
      renderer,
    );
    lighting.sync({
      darkness: 0.15,
      accents: [
        {
          kind: 'neon',
          color: [0.15, 0.45, 1],
          intensity: 0.7,
          direction: [-0.4, 0.1, 1],
        },
        {
          kind: 'headlights',
          color: [1, 0.9, 0.7],
          intensity: 0.5,
          direction: [0.3, -0.1, 1],
        },
      ],
    });
    reportStage('renderer-created');

    try {
      reportStage('babylon-render-start');
      renderer.render(frame);
      taxi.scene.render();
      taxiRenderSucceeded = true;
      reportStage('babylon-render-complete');
    } catch (error) {
      taxiRenderError = errorMessage(error);
    }

    return {
      puppetName: session.name,
      puppetAuthor: session.author,
      parameterCount: parameters.length,
      parameterExercised,
      parameterDescriptors,
      directGazeWriteReadback,
      performanceCueApplied,
      performanceValues,
      lightingApplied: true,
      vertexCount: frame.vertices.length,
      indexCount: frame.indices.length,
      textureCount: frame.textures.length,
      commandCount: frame.commands.length,
      drawStates: [
        ...new Set(frame.commands.map((command) => command.state)),
      ],
      blendModes: [
        ...new Set(
          frame.commands.map((command) => command.blendMode),
        ),
      ],
      maskLayerCount: program.maskLayerCount,
      maximumMaskDepth: program.maximumMaskDepth,
      maximumCompositeDepth: program.maximumCompositeDepth,
      taxiPassengerSeatAnchor: taxi.anchors.passengerSeat.name,
      taxiRenderAttempted: true,
      taxiRenderSucceeded,
      taxiRenderError,
    };
  } finally {
    renderer?.dispose();
    session?.dispose();
    bindings?.dispose();
    taxi.scene.dispose();
    engine.dispose();
    canvas.remove();
  }
}
