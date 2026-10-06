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

export interface InochiRealPuppetProbeSummary {
  readonly puppetName: string;
  readonly puppetAuthor: string;
  readonly parameterCount: number;
  readonly parameterExercised: string | null;
  readonly parameterValueChanged: boolean;
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

export interface InochiBrowserProbeSummary {
  readonly puppetName: string;
  readonly puppetAuthor: string;
  readonly parameterCount: number;
  readonly parameterExercised: string | null;
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
  readonly realPuppet: InochiRealPuppetProbeSummary;
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


function changedParameterValue(
  lowerBounds: readonly number[],
  upperBounds: readonly number[],
  current: readonly number[],
): readonly number[] | null {
  if (
    lowerBounds.length !== upperBounds.length ||
    current.length !== lowerBounds.length
  ) {
    return null;
  }

  const next = current.map((value, index) => {
    const lower = lowerBounds[index];
    const upper = upperBounds[index];

    if (
      lower === undefined ||
      upper === undefined ||
      !Number.isFinite(lower) ||
      !Number.isFinite(upper) ||
      upper <= lower
    ) {
      return value;
    }

    return Math.abs(value - lower) > 1e-5
      ? lower
      : upper;
  });

  return next.some(
    (value, index) =>
      Math.abs(value - (current[index] ?? value)) > 1e-5,
  )
    ? next
    : null;
}

async function runPinnedAdaProbe(
  taxi: ReturnType<typeof createTaxiScene>,
  runtime: OfficialInochiRuntimeAdapter,
): Promise<InochiRealPuppetProbeSummary> {
  let session: InochiPuppetSession | null = null;
  let renderer: BabylonInochiPassengerRenderer | null = null;

  try {
    reportStage('ada-runtime-reused');
    reportStage('ada-load-start');
    session = await InochiPuppetSession.load(runtime, {
      id: 'inochi2d-upstream-ada-static',
      load: () => loadFixture('/__fixtures__/ada-static.inx'),
    });
    reportStage('ada-loaded');

    const parameters = session.listParameters();
    let parameterExercised: string | null = null;
    let parameterValueChanged = false;

    for (const parameter of parameters) {
      const next = changedParameterValue(
        parameter.lowerBounds,
        parameter.upperBounds,
        parameter.value,
      );

      if (next === null) {
        continue;
      }

      session.setParameter(parameter.name, next);
      parameterExercised = parameter.name;
      parameterValueChanged = true;
      break;
    }

    reportStage('ada-frame-start');
    const frame = session.frame(1 / 60);
    reportStage('ada-frame-built');

    const program = compileInochiRenderProgram(frame);
    reportStage('ada-render-program-built');

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

    let taxiRenderSucceeded = false;
    let taxiRenderError: string | null = null;

    try {
      reportStage('ada-babylon-render-start');
      renderer.render(frame);
      taxi.scene.render();
      taxiRenderSucceeded = true;
      reportStage('ada-babylon-render-complete');
    } catch (error) {
      taxiRenderError = errorMessage(error);
    }

    return {
      puppetName: session.name,
      puppetAuthor: session.author,
      parameterCount: parameters.length,
      parameterExercised,
      parameterValueChanged,
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
  }
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

    const basePerformanceProfile =
      productionContent.passengerPerformance.profiles[0];
    const performanceProfile = {
      ...basePerformanceProfile,
      channels: {
        talk: [
          {
            parameterName: 'Mouth',
            components: [{ source: 'value', invert: false }],
          },
        ],
        blink: [
          {
            parameterName: 'Blink',
            components: [{ source: 'value', invert: false }],
          },
        ],
        gaze: [
          {
            parameterName: 'GazeX',
            components: [{ source: 'x', invert: false }],
          },
          {
            parameterName: 'GazeY',
            components: [{ source: 'y', invert: false }],
          },
        ],
        head: [
          {
            parameterName: 'HeadX',
            components: [{ source: 'x', invert: false }],
          },
          {
            parameterName: 'HeadY',
            components: [{ source: 'y', invert: false }],
          },
        ],
        body: [
          {
            parameterName: 'BodyX',
            components: [{ source: 'x', invert: false }],
          },
          {
            parameterName: 'BodyY',
            components: [{ source: 'y', invert: false }],
          },
        ],
      },
    };
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

    const baselineSummary = {
      puppetName: session.name,
      puppetAuthor: session.author,
      parameterCount: parameters.length,
      parameterExercised,
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

    renderer.dispose();
    renderer = null;
    session.dispose();
    session = null;
    reportStage('baseline-released');

    const realPuppet = await runPinnedAdaProbe(taxi, runtime);
    reportStage('ada-acceptance-complete');

    return {
      ...baselineSummary,
      realPuppet,
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
