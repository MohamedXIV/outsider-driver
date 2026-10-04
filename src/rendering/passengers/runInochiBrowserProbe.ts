import { Engine } from '@babylonjs/core/Engines/engine';
import { productionContent } from '../../content/production/ProductionContent';
import { createTaxiScene } from '../taxi/createTaxiScene';
import { BabylonInochiPassengerRenderer } from './BabylonInochiPassengerRenderer';
import { InochiPuppetSession } from './InochiPuppetSession';
import { compileInochiRenderProgram } from './InochiRenderProgram';
import { InochiWasmBindings } from './InochiWasmBindings';
import { OfficialInochiRuntimeAdapter } from './OfficialInochiRuntimeAdapter';

export interface InochiBrowserProbeSummary {
  readonly puppetName: string;
  readonly puppetAuthor: string;
  readonly parameterCount: number;
  readonly parameterExercised: string | null;
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
