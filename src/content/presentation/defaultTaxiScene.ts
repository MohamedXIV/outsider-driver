import {
  TaxiSceneDefinitionSchema,
  type TaxiSceneDefinition,
} from './TaxiSceneDefinition';

export const defaultTaxiSceneDefinition: TaxiSceneDefinition =
  TaxiSceneDefinitionSchema.parse({
    schemaVersion: 1,
    camera: {
      transform: {
        position: [-0.35, 0.78, -0.7],
        rotation: [0, 0, 0],
      },
      fovRadians: 1.05,
      minZ: 0.05,
      maxZ: 250,
    },
    anchors: {
      passengerSeat: {
        position: [0.48, 0.05, 1.45],
        rotation: [0, Math.PI, 0],
      },
      passengerLighting: {
        position: [0.35, 1.15, 1.05],
        rotation: [0, 0, 0],
      },
      radio: {
        position: [-0.42, 0.48, 0.08],
        rotation: [0, 0, 0],
      },
      navigation: {
        position: [0, 0.56, 0.12],
        rotation: [0, 0, 0],
      },
      translator: {
        position: [0.42, 0.48, 0.08],
        rotation: [0, 0, 0],
      },
    },
    lighting: {
      ambientDirection: [0.2, 1, -0.25],
      ambientColor: [0.28, 0.34, 0.48],
      ambientIntensity: 0.55,
      cabinColor: [0.95, 0.42, 0.18],
      cabinIntensity: 1.3,
    },
    environment: {
      clearColor: [0.015, 0.02, 0.035, 1],
    },
    assets: [
      {
        id: 'cockpit-floor',
        kind: 'box',
        space: 'taxi-interior',
        size: [1.9, 0.12, 3.6],
        transform: {
          position: [0, -0.45, 0.9],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.06, 0.065, 0.075],
        },
      },
      {
        id: 'dashboard-shell',
        kind: 'box',
        space: 'taxi-interior',
        size: [1.8, 0.55, 0.48],
        transform: {
          position: [0, 0.25, 0.02],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.075, 0.08, 0.09],
        },
      },
      {
        id: 'left-door-shell',
        kind: 'box',
        space: 'taxi-interior',
        size: [0.12, 1.1, 2.8],
        transform: {
          position: [-0.96, 0.08, 1],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.05, 0.055, 0.065],
        },
      },
      {
        id: 'right-door-shell',
        kind: 'box',
        space: 'taxi-interior',
        size: [0.12, 1.1, 2.8],
        transform: {
          position: [0.96, 0.08, 1],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.05, 0.055, 0.065],
        },
      },
      {
        id: 'rear-cabin-shell',
        kind: 'box',
        space: 'taxi-interior',
        size: [1.85, 1.25, 0.12],
        transform: {
          position: [0, 0.18, 2.48],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.045, 0.05, 0.06],
        },
      },
      {
        id: 'road-bed',
        kind: 'box',
        space: 'world',
        size: [9, 0.08, 80],
        transform: {
          position: [0, -0.62, 24],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.025, 0.03, 0.04],
        },
      },
      {
        id: 'world-light-strip-left',
        kind: 'box',
        space: 'world',
        size: [0.15, 0.15, 32],
        transform: {
          position: [-3.2, 0.25, 18],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.05, 0.06, 0.09],
          emissiveColor: [0.12, 0.22, 0.42],
        },
      },
      {
        id: 'world-light-strip-right',
        kind: 'box',
        space: 'world',
        size: [0.15, 0.15, 32],
        transform: {
          position: [3.2, 0.25, 18],
          rotation: [0, 0, 0],
        },
        material: {
          diffuseColor: [0.08, 0.05, 0.045],
          emissiveColor: [0.42, 0.12, 0.06],
        },
      },
    ],
  });
