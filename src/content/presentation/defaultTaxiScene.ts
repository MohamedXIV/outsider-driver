import {
  TaxiSceneDefinitionSchema,
  type TaxiSceneDefinition,
} from './TaxiSceneDefinition';

type Asset = TaxiSceneDefinition['assets'][number];
type Triple = [number, number, number];
const cream: Triple = [0.64, 0.58, 0.4];
const olive: Triple = [0.2, 0.27, 0.22];
const rubber: Triple = [0.065, 0.085, 0.078];
const brass: Triple = [0.55, 0.38, 0.18];
const amber: Triple = [0.85, 0.46, 0.13];
const cloth: Triple = [0.32, 0.38, 0.29];

// Authored assembly helpers produce ordinary serializable presentation data.
function part(
  id: string, size: Triple, position: Triple, color: Triple,
  options: { kind?: Asset['kind']; rotation?: Triple; emission?: Triple; texture?: string; world?: boolean } = {},
): Asset {
  const textureUrl = options.texture ?? (color === cloth ? '/taxi/upholstery.svg' : color === cream || color === olive ? '/taxi/paint.svg' : undefined);
  return {
    id, kind: options.kind ?? 'box', space: options.world === true ? 'world' : 'taxi-interior',
    size, tessellation: 16, tubeRatio: 0.09,
    transform: { position, rotation: options.rotation ?? [0, 0, 0], scale: [1, 1, 1] },
    material: { diffuseColor: color, emissiveColor: options.emission ?? [0, 0, 0], ...(textureUrl === undefined ? {} : { textureUrl }) },
  };
}

const assets: Asset[] = [
  part('cockpit-floor', [2.6, 0.12, 3.6], [0, -0.24, 0.15], rubber),
  part('dashboard-shell', [2.45, 0.48, 0.5], [0, 0.48, 1.3], olive),
  part('dashboard-padded-brow', [2.48, 0.12, 0.62], [0, 0.78, 1.3], rubber),
  part('dashboard-cream-fascia', [2.4, 0.35, 0.055], [0, 0.48, 1.022], cream),
  part('dashboard-lower-rail', [2.4, 0.05, 0.08], [0, 0.29, 0.99], brass),
  part('instrument-bezel', [0.69, 0.32, 0.08], [-0.62, 0.54, 0.965], rubber),
  part('instruments', [0.63, 0.27, 0.01], [-0.62, 0.54, 0.918], [1, 1, 1], {kind: 'plane', texture: '/taxi/instruments.svg', emission: [0.7, 0.7, 0.7]}),
  part('radio-housing', [0.43, 0.27, 0.12], [-0.04, 0.51, 0.93], olive),
  part('radio-face', [0.37, 0.21, 0.01], [-0.04, 0.52, 0.863], [1, 1, 1], {kind: 'plane', texture: '/taxi/radio.svg', emission: [0.45, 0.45, 0.45]}),
  part('navigation-housing', [0.44, 0.4, 0.2], [0.49, 0.88, 0.98], rubber, {rotation: [0.08, -0.14, 0]}),
  part('navigation-display', [0.36, 0.29, 0.01], [0.506, 0.889, 0.86], [1, 1, 1], {kind: 'plane', rotation: [0.08, -0.14, 0], texture: '/taxi/navigation.svg', emission: [0.6, 0.6, 0.6]}),
  part('glovebox', [0.52, 0.24, 0.045], [0.95, 0.48, 0.98], olive),
  part('glovebox-latch', [0.13, 0.035, 0.035], [0.94, 0.55, 0.945], brass),
  part('translator-label', [0.22, 0.065, 0.01], [0.91, 0.38, 0.946], [1, 1, 1], {kind: 'plane', texture: '/taxi/permit.svg', emission: [0.2, 0.2, 0.2]}),
  part('fascia-repair-plate', [0.11, 0.29, 0.016], [-1.08, 0.48, 0.983], [0.38, 0.4, 0.35]),
  part('repair-tape', [0.13, 0.035, 0.014], [-1.08, 0.53, 0.97], [0.59, 0.49, 0.3], {rotation: [0, 0, -0.18]}),
  part('steering-column', [0.095, 0.4, 0.095], [-0.63, 0.32, 0.55], rubber, {kind: 'cylinder', rotation: [1.03, 0, 0]}),
  part('steering-rim', [0.52, 0.52, 0.52], [-0.63, 0.59, 0.49], brass, {kind: 'torus', rotation: [1.16, 0, 0]}),
  part('steering-hub', [0.14, 0.065, 0.14], [-0.63, 0.59, 0.49], olive, {kind: 'cylinder', rotation: [1.16, 0, 0]}),
  part('steering-spoke-left', [0.22, 0.035, 0.04], [-0.74, 0.59, 0.49], cream),
  part('steering-spoke-right', [0.22, 0.035, 0.04], [-0.52, 0.59, 0.49], cream),
  part('steering-spoke-down', [0.035, 0.2, 0.04], [-0.63, 0.49, 0.535], cream, {rotation: [-0.41, 0, 0]}),
  part('indicator-stalk', [0.22, 0.035, 0.035], [-0.88, 0.51, 0.63], rubber, {rotation: [0, 0.14, 0]}),
  part('console-base', [0.26, 0.24, 0.6], [0.08, 0.12, 0.43], olive),
  part('gear-stick', [0.035, 0.35, 0.035], [0.08, 0.36, 0.34], brass, {kind: 'cylinder', rotation: [0.15, 0, -0.1]}),
  part('gear-knob', [0.09, 0.07, 0.09], [0.098, 0.54, 0.365], rubber, {kind: 'cylinder'}),
  part('handset-cradle', [0.12, 0.18, 0.1], [0.26, 0.47, 0.97], rubber),
  part('handset', [0.075, 0.26, 0.075], [0.26, 0.55, 0.885], brass, {rotation: [0, 0, -0.12]}),
  part('footwell-mat', [0.67, 0.035, 0.8], [-0.62, -0.16, 0.03], rubber),
  part('brake-pedal', [0.12, 0.12, 0.05], [-0.68, -0.06, 0.6], brass, {rotation: [-0.4, 0, 0]}),
  part('accelerator-pedal', [0.055, 0.18, 0.05], [-0.4, -0.05, 0.63], rubber, {rotation: [-0.4, 0, 0]}),
  part('rear-cabin-shell', [2.6, 1.7, 0.12], [0, 0.65, -1.7], olive),
  part('roof', [2.6, 0.12, 3.6], [0, 1.97, 0.15], olive),
  part('windshield-header', [2.55, 0.14, 0.18], [0, 1.85, 1.72], cream),
  part('windshield-sill', [2.5, 0.075, 0.15], [0, 0.84, 1.63], cream),
  part('mirror-stem', [0.025, 0.17, 0.03], [0, 1.73, 1.5], rubber),
  part('mirror-frame', [0.38, 0.12, 0.065], [0, 1.66, 1.47], rubber),
  part('mirror-glass', [0.33, 0.085, 0.01], [0, 1.66, 1.43], [0.25, 0.33, 0.31], {emission: [0.08, 0.12, 0.1]}),
  part('visor', [0.59, 0.18, 0.06], [-0.67, 1.79, 1.45], olive),
  part('visor-permit', [0.3, 0.09, 0.01], [-0.67, 1.79, 1.415], [1, 1, 1], {kind: 'plane', texture: '/taxi/permit.svg'}),
  part('dome-lamp-base', [0.3, 0.055, 0.18], [0.26, 1.88, 0.35], rubber),
  part('dome-lamp-diffuser', [0.22, 0.025, 0.13], [0.26, 1.84, 0.35], cream, {emission: [0.8, 0.55, 0.24]}),
  part('hood', [2.25, 0.12, 1.5], [0, 0.4, 2.47], olive),
  part('hood-center-ridge', [0.04, 0.035, 1.5], [0, 0.48, 2.47], cream),
];

for (const side of [-1, 1]) {
  const name = side < 0 ? 'left' : 'right';
  assets.push(
    part(`${name}-door-shell`, [0.12, 0.85, 3.4], [side * 1.28, 0.25, 0.05], olive),
    part(`${name}-door-insert`, [0.025, 0.36, 1.7], [side * 1.205, 0.35, 0.25], cloth),
    part(`${name}-door-armrest`, [0.15, 0.09, 0.65], [side * 1.14, 0.37, 0.15], rubber),
    part(`${name}-door-handle`, [0.05, 0.055, 0.22], [side * 1.16, 0.55, 0.44], brass),
    part(`${name}-window-rail`, [0.13, 0.075, 3.2], [side * 1.24, 0.73, 0.08], cream),
    part(`${name}-windshield-pillar`, [0.095, 1.08, 0.1], [side * 1.21, 1.33, 1.68], cream, {rotation: [-0.13, 0, side * 0.08]}),
    part(`${name}-window-rear-pillar`, [0.11, 1.1, 0.14], [side * 1.24, 1.31, -0.6], cream),
    part(`${name}-wiper`, [0.51, 0.025, 0.022], [side * 0.57, 0.89, 1.82], rubber, {rotation: [0, 0, side * 0.12]}),
  );
}
for (const [name, x] of [['driver', -0.65], ['passenger', 0.68]] as const) {
  assets.push(
    part(`${name}-seat-base`, [0.73, 0.23, 0.79], [x, 0.12, -0.06], rubber),
    part(`${name}-seat-cushion`, [0.7, 0.14, 0.73], [x, 0.3, -0.02], cloth),
    part(`${name}-seat-back`, [0.7, 0.77, 0.16], [x, 0.7, -0.41], cloth, {rotation: [0.1, 0, 0]}),
    part(`${name}-headrest-post-left`, [0.023, 0.2, 0.023], [x - 0.12, 1.09, -0.45], brass, {kind: 'cylinder'}),
    part(`${name}-headrest-post-right`, [0.023, 0.2, 0.023], [x + 0.12, 1.09, -0.45], brass, {kind: 'cylinder'}),
    part(`${name}-headrest`, [0.43, 0.24, 0.16], [x, 1.23, -0.46], olive),
    part(`${name}-seat-patch`, [0.18, 0.23, 0.018], [x + 0.15, 0.74, -0.316], cream),
    part(`${name}-seatbelt`, [0.045, 0.72, 0.018], [x - 0.23, 0.73, -0.303], rubber, {rotation: [0, 0, -0.24]}),
    part(`${name}-belt-buckle`, [0.075, 0.08, 0.08], [x - 0.39, 0.31, 0.06], brass),
  );
  for (let rib = 0; rib < 5; rib++) {
    assets.push(part(`${name}-cushion-seam-${String(rib)}`, [0.018, 0.012, 0.6], [x - 0.23 + rib * 0.115, 0.378, -0.02], olive));
  }
}
for (let slat = 0; slat < 7; slat++) {
  assets.push(part(`vent-slat-${String(slat)}`, [0.02, 0.075, 0.014], [0.78 + slat * 0.045, 0.7, 0.988], rubber));
}
for (let i = 0; i < 3; i++) {
  assets.push(
    part(`toggle-base-${String(i)}`, [0.09, 0.075, 0.025], [-0.16 + i * 0.11, 0.34, 0.975], rubber),
    part(`toggle-${String(i)}`, [0.018, 0.055, 0.018], [-0.16 + i * 0.11, 0.36, 0.95], brass, {kind: 'cylinder', rotation: [-0.5, 0, 0]}),
    part(`radio-knob-${String(i)}`, [0.04, 0.034, 0.04], [-0.15 + i * 0.11, 0.46, 0.843], brass, {kind: 'cylinder', rotation: [Math.PI / 2, 0, 0]}),
  );
}
for (const x of [-0.95, -0.32, 0.75, 1.15]) {
  assets.push(part(`fascia-fastener-${String(x).replace('.', '-').replace('-', 'n')}`, [0.018, 0.012, 0.018], [x, 0.61, 0.981], brass, {kind: 'cylinder', rotation: [Math.PI / 2, 0, 0]}));
}

// The eye sits ahead of the driver backrest, never behind its headrest.
for (const asset of assets) {
  if (asset.id.startsWith('driver-')) asset.transform.position[2] -= 1.15;
  if (asset.id.startsWith('passenger-')) asset.transform.position[2] -= 0.9;
}

// A composed night street supplies depth before route-specific scenery is mounted.
assets.push(part('road-bed', [12, 0.08, 160], [0, -0.34, 65], [0.19, 0.22, 0.23], {world: true}));
for (const side of [-1, 1]) {
  assets.push(part(`curb-${side < 0 ? 'left' : 'right'}`, [1.4, 0.2, 150], [side * 5.1, -0.23, 65], [0.29, 0.31, 0.3], {world: true}));
  for (let block = 0; block < 9; block++) {
    const z = 8 + block * 12;
    const height = 4 + (block % 3) * 2.6;
    const prefix = `city-${side < 0 ? 'left' : 'right'}-${String(block)}`;
    const facade: Triple = side < 0 ? [0.24, 0.3, 0.31] : [0.34, 0.29, 0.23];
    assets.push(
      part(`${prefix}-building`, [5, height, 9], [side * 8.4, height / 2 - 0.3, z], facade, {world: true}),
      part(`${prefix}-awning`, [0.8, 0.18, 6.5], [side * 5.65, 1.8, z], olive, {world: true}),
      part(`${prefix}-lamp-post`, [0.08, 3.7, 0.08], [side * 4.4, 1.6, z + 3], rubber, {world: true}),
      part(`${prefix}-lamp`, [0.4, 0.13, 0.4], [side * 4.4, 3.45, z + 3], amber, {world: true, emission: [0.9, 0.61, 0.3]}),
      part(`${prefix}-shop-sign`, [0.035, 0.5, 2.3], [side * 5.88, 2.4, z], [0.4, 0.35, 0.2], {world: true, emission: [0.35, 0.22, 0.08]}),
    );
    for (let floor = 0; floor < Math.floor(height / 1.7); floor++) {
      for (let window = 0; window < 4; window++) {
        assets.push(part(`${prefix}-window-${String(floor)}-${String(window)}`, [0.025, 0.72, 0.85], [side * 5.88, 0.9 + floor * 1.7, z - 3 + window * 2], [0.31, 0.38, 0.35], {world: true, emission: (window + floor + block) % 3 === 0 ? [0.44, 0.3, 0.14] : [0.065, 0.105, 0.11]}));
      }
    }
  }
}
for (let dash = 0; dash < 24; dash++) {
  assets.push(part(`lane-marking-${String(dash)}`, [0.1, 0.014, 2], [0, -0.291, 5 + dash * 6], cream, {world: true, emission: [0.06, 0.055, 0.03]}));
}

export const defaultTaxiSceneDefinition: TaxiSceneDefinition = TaxiSceneDefinitionSchema.parse({
  schemaVersion: 1,
  camera: { transform: {position: [-0.6, 1.2, -1.08], rotation: [0.16, 0.26, 0]}, fovRadians: 1.1, minZ: 0.035, maxZ: 180 },
  anchors: {
    passengerSeat: {position: [0.68, 0.36, -0.92], rotation: [0, Math.PI, 0]},
    passengerLighting: {position: [0.15, 1.72, 0.25], rotation: [0, 0, 0]},
    radio: {position: [-0.04, 0.52, 0.86], rotation: [0, 0, 0]},
    navigation: {position: [0.506, 0.889, 0.86], rotation: [0.08, -0.14, 0]},
    translator: {position: [0.91, 0.38, 0.94], rotation: [0, 0, 0]},
  },
  lighting: { ambientDirection: [0.2, 1, -0.25], ambientColor: [0.56, 0.65, 0.72], ambientIntensity: 0.55, cabinColor: [1, 0.82, 0.57], cabinIntensity: 1.1, headlights: [-0.75, 0.75].map((x) => ({position: [x, 0.45, 3.2], direction: [0, -0.24, 1], color: [1, 0.86, 0.63], intensity: 1.4, range: 32, angleRadians: 0.7})) },
  environment: { clearColor: [0.035, 0.063, 0.087, 1] },
  assets,
});
