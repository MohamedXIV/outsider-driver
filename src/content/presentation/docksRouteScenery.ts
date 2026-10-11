import type { TaxiSceneDefinition } from './TaxiSceneDefinition';

/**
 * Deterministic, authored Docks vista seen from the taxi. These are presentation
 * assets under worldRoot, never a physical street simulation or save data.
 * Repeated geometry/materials are shared by createTaxiScene.
 */
type Asset = TaxiSceneDefinition['assets'][number];
type Vec3 = [number, number, number];
type Shape = Asset['kind'];

const teal: Vec3 = [0.29, 0.48, 0.47];
const wornTeal: Vec3 = [0.42, 0.56, 0.51];
const cream: Vec3 = [0.77, 0.68, 0.52];
const brass: Vec3 = [0.65, 0.44, 0.22];
const dark: Vec3 = [0.19, 0.29, 0.32];
const glow: Vec3 = [0.85, 0.55, 0.24];
const sea: Vec3 = [0.13, 0.31, 0.37];

interface Options {
  readonly kind?: Shape;
  readonly rotation?: Vec3;
  readonly texture?: '/taxi/docks-road.svg' | '/taxi/docks-enamel.svg' | '/taxi/docks-glyph.svg';
  readonly emissive?: Vec3;
  readonly tessellation?: number;
}

function part(
  id: string, size: Vec3, position: Vec3, color: Vec3,
  options: Options = {},
): Asset {
  return {
    id,
    kind: options.kind ?? 'box',
    tessellation: options.tessellation ?? 12,
    tubeRatio: 0.1,
    space: 'world',
    size,
    transform: {
      position,
      rotation: options.rotation ?? [0, 0, 0],
      scale: [1, 1, 1],
    },
    material: {
      diffuseColor: color,
      emissiveColor: options.emissive ?? [0, 0, 0],
      ...(options.texture === undefined ? {} : { textureUrl: options.texture }),
    },
  };
}

/** Each route tile has its own UVs, so painted asphalt does not stretch 160m. */
function addRoad(assets: Asset[]): void {
  assets.push(part('road-bed', [12, 0.08, 160], [0, -0.34, 65], dark));
  for (let i = 0; i < 20; i++) {
    const z = 1 + i * 8;
    assets.push(part(`road-colored-tile-${i}`, [11.5, 0.012, 8], [0, -0.292, z], teal, {
      texture: '/taxi/docks-road.svg',
    }));
  }
  for (const side of [-1, 1]) {
    const which = side < 0 ? 'left' : 'right';
    assets.push(part(`curb-${which}`, [1.3, 0.22, 160], [side * 6.25, -0.21, 65], cream));
    assets.push(part(`sidewalk-${which}`, [1.6, 0.07, 160], [side * 7.5, -0.17, 65], dark));
  }
  for (let i = 0; i < 24; i++) {
    assets.push(part(`lane-marking-${i}`, [0.11, 0.012, 2], [0, -0.277, 5 + i * 6], cream));
  }
}

function addDockBuildings(assets: Asset[]): void {
  for (const side of [-1, 1]) {
    const which = side < 0 ? 'left' : 'right';
    for (let i = 0; i < 5; i++) {
      const z = 13 + i * 27;
      const radius = 3.4 + (i % 2) * 0.65;
      const height = 5.5 + (i % 3) * 2;
      const x = side * (11.7 + (i % 2) * 1.7);
      const stem = `docks-${which}-${i}`;
      assets.push(
        part(`${stem}-shell`, [radius * 2, height, radius * 2], [x, height / 2 - 0.29, z], wornTeal, {
          kind: 'cylinder', texture: '/taxi/docks-enamel.svg', tessellation: 16,
        }),
        part(`${stem}-lower-ring`, [radius * 2.25, 0.3, radius * 2.25], [x, 1.72, z], dark, {
          kind: 'cylinder', tessellation: 16,
        }),
        part(`${stem}-roof`, [radius * 2.4, 0.55, radius * 2.4], [x, height - 0.12, z], cream, {
          kind: 'cylinder', tessellation: 16,
        }),
        part(`${stem}-cap`, [radius * 1.55, 0.65, radius * 1.55], [x, height + 0.43, z], brass, {
          kind: 'cylinder', tessellation: 16,
        }),
        part(`${stem}-porthole`, [1.0, 1.55, 0.07], [x - side * (radius + 0.08), 2.7, z], [1, 1, 1], {
          kind: 'plane', rotation: [0, side * Math.PI / 2, 0],
          texture: '/taxi/docks-glyph.svg', emissive: [0.24, 0.22, 0.16],
        }),
      );
      // Distinct freight-door block; the actual high-contrast details are
      // hand-painted on the reusable SVG rather than thousands of bolts.
      assets.push(part(`${stem}-service-pod`, [3.1, 2.1, 3.4], [x - side * (radius + 0.55), 0.75, z + 1.8], dark, {
        texture: '/taxi/docks-enamel.svg',
      }));
    }
  }
}

function addBridge(assets: Asset[], number: number, z: number): void {
  const id = `docks-overpass-${number}`;
  assets.push(
    part(`${id}-deck`, [41, 0.72, 5.5], [0, 5.4, z], teal, {
      texture: '/taxi/docks-road.svg',
    }),
    part(`${id}-front-guard`, [41, 0.56, 0.16], [0, 5.98, z - 2.68], cream),
    part(`${id}-rear-guard`, [41, 0.56, 0.16], [0, 5.98, z + 2.68], cream),
    part(`${id}-underside`, [41, 0.25, 4.7], [0, 4.91, z], dark),
  );
  for (const side of [-1, 1]) {
    const which = side < 0 ? 'left' : 'right';
    // Foundations touch the sidewalk/ground and directly support the deck.
    assets.push(
      part(`${id}-pier-${which}`, [1.7, 5.65, 1.65], [side * 8.4, 2.48, z], cream, {
        kind: 'cylinder', tessellation: 12, texture: '/taxi/docks-enamel.svg',
      }),
      part(`${id}-pier-foot-${which}`, [2.6, 0.44, 2.6], [side * 8.4, -0.04, z], dark, {
        kind: 'cylinder',
      }),
    );
  }
}

function addCargoVehicle(assets: Asset[], number: number, x: number, z: number): void {
  const id = `docks-cargo-${number}`;
  assets.push(
    part(`${id}-chassis`, [1.95, 0.42, 4.45], [x, 0.32, z], dark),
    part(`${id}-cab`, [1.95, 1.45, 1.56], [x, 1.1, z + 1.26], brass, {
      kind: 'cylinder', rotation: [Math.PI / 2, 0, 0], tessellation: 12,
    }),
    part(`${id}-tank`, [2.0, 1.35, 2.65], [x, 1.12, z - 0.9], wornTeal, {
      kind: 'cylinder', rotation: [Math.PI / 2, 0, 0],
      texture: '/taxi/docks-enamel.svg',
    }),
    part(`${id}-windshield`, [1.28, 0.55, 0.045], [x, 1.24, z + 2.06], dark),
  );
  for (const axle of [-1.4, 1.4]) {
    for (const side of [-1, 1]) {
      assets.push(part(
        `${id}-wheel-${axle < 0 ? 'rear' : 'front'}-${side < 0 ? 'left' : 'right'}`,
        [0.85, 0.32, 0.85], [x + side * 0.96, 0.1, z + axle], dark, {
          kind: 'cylinder', rotation: [0, 0, Math.PI / 2], tessellation: 12,
        },
      ));
    }
  }
}

function addPortDetails(assets: Asset[]): void {
  // Low river surface and the crane are viewed across the left dock.
  assets.push(part('docks-water', [45, 0.04, 160], [-32, -0.38, 65], sea));
  assets.push(
    part('docks-crane-base', [2.5, 0.5, 2.5], [-17.5, -0.04, 37], dark),
    part('docks-crane-tower', [0.8, 13, 0.85], [-17.5, 6.65, 37], brass),
    part('docks-crane-boom', [0.6, 0.75, 12.5], [-15.5, 12.85, 40], cream, {
      rotation: [0, -0.4, 0.12],
    }),
    part('docks-crane-lift', [0.07, 5.0, 0.07], [-12.3, 9.3, 44.7], dark),
    part('docks-crane-cargo', [2.4, 1.55, 2.5], [-12.3, 5.98, 44.7], wornTeal),
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const z = 7 + i * 25;
      const x = side * 6.9;
      const name = `docks-lamp-${side < 0 ? 'left' : 'right'}-${i}`;
      assets.push(
        part(`${name}-post`, [0.14, 3.5, 0.14], [x, 1.61, z], dark, {
          kind: 'cylinder',
        }),
        part(`${name}-head`, [0.8, 0.18, 0.46], [x - side * 0.27, 3.38, z], brass, {
          emissive: glow,
        }),
      );
    }
  }
}

/** Data only. No scene lifecycle, route decisions, physics or renderer state. */
export function createDocksRouteScenery(): Asset[] {
  const assets: Asset[] = [];
  addRoad(assets);
  addDockBuildings(assets);
  addBridge(assets, 0, 52);
  addBridge(assets, 1, 117);
  addCargoVehicle(assets, 0, 2.85, 26);
  addCargoVehicle(assets, 1, -2.8, 91);
  addPortDetails(assets);
  return assets;
}
